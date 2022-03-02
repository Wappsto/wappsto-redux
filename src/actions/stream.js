import querystring from 'query-string';

import config from '../config';
import { getUrlInfo, getServiceVersion } from '../util/helpers';
import { addEntities, removeEntities } from './entities';
import schemas from '../util/schemas';

export const UPDATE_STREAM = 'UPDATE_STREAM';
export const REMOVE_STREAM = 'REMOVE_STREAM';

let lostTimer = 1000 * 60;
let retryTimer = 1000 * 5;

export function setStreamLostTime(timeout) {
  lostTimer = timeout;
}

export function setStreamRetryTime(timeout) {
  retryTimer = timeout;
}

let timeouts = {};
let websockets = {};

//add also connection lost and timer of 5 minutes of waiting in general
export const status = {
  CONNECTING: 1,
  OPEN: 2,
  CLOSED: 3,
  RECONNECTING: 4,
  ERROR: 5,
  LOST: 6
};

export const steps = {
  CONNECTING: {
    GET_STREAM: 1,
    CREATE_STREAM: 2,
    UPDATE_STREAM: 3,
    OPENING_SOCKET: 4,
    WAITING: 5
  }
};

export function updateStream(name, status, step, ws, json, increment) {
  const obj = { type: UPDATE_STREAM };
  if (ws !== undefined) {
    websockets[name] = ws;
    obj.ws = ws;
  }
  if (name !== undefined) {
    obj.name = name;
  }
  if (status !== undefined) {
    obj.status = status;
  }
  if (step !== undefined) {
    obj.step = step;
  }
  if (json !== undefined) {
    obj.json = json;
  }
  if (increment !== undefined) {
    obj.increment = increment;
  }
  return obj;
}

export function openStream(streamJSON = {}, session, options) {
  return (dispatch, getState) => {
    if (!streamJSON.name) {
      console.log('open stream requires a name to work');
      return;
    }
    if (!session) {
      session = getState().session && getState().session.meta.id;
    }
    return _startStream(streamJSON, session, getState, dispatch, options);
  };
}

export function closeStream(name, silent = false) {
  return (dispatch) => {
    _clearStreamTimeouts({ name });
    if (websockets[name]) {
      websockets[name].silent = silent;
      websockets[name].stop = true;
      websockets[name].close();
    }
    dispatch(removeStream(name));
  };
}

function removeStream(name) {
  return {
    type: REMOVE_STREAM,
    name
  };
}

/*
function _mergeStreams(oldJSON, newJSON) {
  let update = false;
  if (newJSON.subscription) {
    newJSON.subscription.forEach((sub) => {
      if (oldJSON.subscription.indexOf(sub) === -1) {
        update = true;
        oldJSON.subscription.push(sub);
      }
    });
  }
  if (newJSON.ignore) {
    newJSON.ignore.forEach((sub) => {
      if (oldJSON.ignore.indexOf(sub) === -1) {
        update = true;
        oldJSON.ignore.push(sub);
      }
    });
  }
  if (oldJSON.full !== newJSON.full) {
    update = true;
    oldJSON = newJSON.full;
  }
  return update ? oldJSON : undefined;
}
*/

function getUrl(options = {}, isEndPoint) {
  const service = (isEndPoint ? options.endPoint : options.service) || 'stream';
  const version = options.hasOwnProperty('version') ? options.version : getServiceVersion(service);
  return config.baseUrl + (version ? '/' + version : '') + '/' + service;
}

/*
async function _createStream(streamJSON, session, dispatch, options) {
  dispatch(
    updateStream(
      streamJSON.name,
      status.CONNECTING,
      steps.CONNECTING.UPDATE_STREAM,
      null,
      streamJSON
    )
  );
  let response = await _request({
    url: getUrl(options),
    method: 'POST',
    body: JSON.stringify(streamJSON),
    headers: { 'x-session': session }
  });
  if (!response.ok) {
    throw response;
  }
  return response.json;
}
*/

function _addChildren(message, state) {
  const dataType = message.meta_object.type;
  const data = message[dataType] || message.data;
  const st = schemas.getSchemaTree(dataType);
  if (data && st.dependencies) {
    const cachedData = state.entities[st.name] && state.entities[st.name][data.meta.id];
    st.dependencies.forEach(({ key, type }) => {
      if (!data.hasOwnProperty(key)) {
        data[key] = cachedData ? cachedData[key] : type === 'many' ? [] : undefined;
      }
    });
  }
}

function _clearStreamTimeouts(stream) {
  if (stream && stream.name && timeouts[stream.name]) {
    clearTimeout(timeouts[stream.name].retryTimeout);
    clearTimeout(timeouts[stream.name].lostTimeout);
    delete timeouts[stream.name];
  }
}

function _startStream(stream, session, getState, dispatch, options, reconnecting) {
  let url = getUrl(options, true);
  if (stream.meta && stream.meta.id) {
    url += '/' + stream.meta.id + '?x-session=' + session;
  } else {
    const streamClone = { ...stream };
    delete streamClone.name;
    url += '/open?x-session=' + session + '&' + querystring.stringify(streamClone);
  }
  if (window && window.location && window.location.origin && !url.startsWith('http')) {
    url = window.location.origin + url;
  }
  url = url.replace('http', 'ws');
  let ws = new WebSocket(url);

  websockets[stream.name] = ws;

  dispatch(
    updateStream(
      stream.name,
      reconnecting ? status.RECONNECTING : status.CONNECTING,
      steps.CONNECTING.OPENING_SOCKET,
      ws,
      stream
    )
  );

  ws.onopen = () => {
    _clearStreamTimeouts(stream);
    dispatch(updateStream(stream.name, status.OPEN, null, ws, stream));
    console.log('Stream open: ' + url);
  };

  ws.onmessage = (e) => {
    // a message was received
    try {
      let data = JSON.parse(e.data);
      if (data.constructor !== Array) {
        data = [data];
      }
      data.forEach((message) => {
        if (!message || !message.meta_object) {
          return;
        }

        let state = getState();
        let parent;
        switch (message.event) {
          case 'create':
            // since stream does not have child list, I'm going to add it from cached store state
            _addChildren(message, state);
            if (message.meta_object.type === 'state') {
              const st = schemas.getSchemaTree('state');
              if (
                state.entities[st.name] &&
                state.entities[st.name].hasOwnProperty(message.meta_object.id)
              ) {
                dispatch(
                  addEntities(
                    message.meta_object.type,
                    message[message.meta_object.type] || message.data,
                    { reset: false }
                  )
                );
              } else {
                let { parent } = getUrlInfo(message.path, 1);
                dispatch(
                  addEntities(
                    message.meta_object.type,
                    [message[message.meta_object.type] || message.data],
                    { reset: false, parent }
                  )
                );
              }
            } else {
              let { parent } = getUrlInfo(message.path, 1);
              dispatch(
                addEntities(
                  message.meta_object.type,
                  message[message.meta_object.type] || message.data,
                  { reset: false, parent }
                )
              );
            }
            break;
          case 'update':
            // since stream does not have child list, I'm going to add it from cached store state
            _addChildren(message, state);
            dispatch(
              addEntities(
                message.meta_object.type,
                message[message.meta_object.type] || message.data,
                { reset: false }
              )
            );
            break;
          case 'delete':
            parent = getUrlInfo(message.path, 1).parent;
            dispatch(
              removeEntities(message.meta_object.type, [message.meta_object.id], {
                parent
              })
            );
            break;
        }
      });
    } catch (error) {
      /* istanbul ignore next */
      console.log('stream catch', error);
    }
  };

  ws.onerror = (e) => {
    console.log('Stream error: ' + url, e.message);
  };

  ws.onclose = (e) => {
    console.log('Stream close: ' + url, e.message);
    if (!ws.stop && e.code !== 4001) {
      timeouts[stream.name] = {};
      let retryTimeout = setTimeout(() => {
        _startStream(stream, session, getState, dispatch, options, false);
      }, retryTimer);
      timeouts[stream.name].retryTimeout = retryTimeout;
      if (!reconnecting) {
        let lostTimeout = setTimeout(() => {
          _clearStreamTimeouts(stream);
          if (websockets[stream.name]) {
            websockets[stream.name].stop = true;
            websockets[stream.name].silent = true;
            websockets[stream.name].close();
          }
          if (!ws.silent) {
            dispatch(updateStream(stream.name, status.LOST, null, null, stream));
          }
        }, lostTimer);
        timeouts[stream.name].lostTimeout = lostTimeout;
      }
      if (!ws.silent) {
        dispatch(
          updateStream(stream.name, status.RECONNECTING, steps.CONNECTING.WAITING, ws, stream, true)
        );
      }
    } else {
      if (!ws.silent) {
        dispatch(updateStream(stream.name, status.CLOSED, e.code, ws, stream));
      }
    }
  };

  return ws;
}

/*
export function initializeStream(streamJSON = {}, session, options) {
  return async (dispatch, getState) => {
    if (!_request) {
      console.log('request function is not set');
      return;
    }
    if (!session) {
      session = getState().session && getState().session.meta.id;
    }
    if (!session) {
      // dispatch no session maybe ?
      console.log('no session specified');
      return;
    }
    try {
      const streamBaseUrl = getUrl(options);
      dispatch(
        updateStream(
          streamJSON.name,
          status.CONNECTING,
          steps.CONNECTING.GET_STREAM,
          null,
          streamJSON
        )
      );
      let headers = { 'x-session': session };
      let url = streamBaseUrl + '?expand=0';
      if (streamJSON.name) {
        url += '&this_name=' + streamJSON.name;
      }
      let response = await _request({ method: 'GET', url, headers });
      if (!response.ok) {
        response.url = url;
        throw response;
      }
      let json = response.json;
      if (json.length > 0) {
        if (!streamJSON.hasOwnProperty('full')) {
          streamJSON.full = true;
        }
        let stream = json[0];

        // merging with json
        let newJSON = _mergeStreams(stream, streamJSON);

        if (newJSON) {
          dispatch(
            updateStream(
              streamJSON.name,
              status.CONNECTING,
              steps.CONNECTING.UPDATE_STREAM,
              null,
              newJSON
            )
          );
          let updateResponse = await _request({
            url: streamBaseUrl + '/' + stream.meta.id,
            method: 'PATCH',
            body: JSON.stringify(newJSON),
            headers
          });
          if (!updateResponse.ok) {
            throw updateResponse;
          }
        }
        return _startStream(newJSON || stream, session, getState, dispatch, options);
      } else {
        let stream = await _createStream(streamJSON, session, dispatch, options);
        return _startStream(stream, session, getState, dispatch, options);
      }
    } catch (e) {
      console.log('initializeStream error', e);
      dispatch(updateStream(streamJSON.name, status.ERROR, null, null, streamJSON));
    }
  };
}
*/
