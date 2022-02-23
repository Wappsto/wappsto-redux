import querystring from 'query-string';

import { request } from './request';

import config from '../config';
import { getUrlInfo, getServiceVersion } from '../util/helpers';
import { addEntities, removeEntities } from './entities';
import schemas from '../util/schemas';

export const UPDATE_STREAM = 'UPDATE_STREAM';
export const REMOVE_STREAM = 'REMOVE_STREAM';

const lostTimer = 1000 * 60;
const retryTimer = 1000 * 5;

const timeouts = {};
const websockets = {};

// add also connection lost and timer of 5 minutes of waiting in general
export const streamStatus = {
  CONNECTING: 1,
  OPEN: 2,
  CLOSED: 3,
  RECONNECTING: 4,
  ERROR: 5,
  LOST: 6,
};

export const steps = {
  CONNECTING: {
    GET_STREAM: 1,
    CREATE_STREAM: 2,
    UPDATE_STREAM: 3,
    OPENING_SOCKET: 4,
    WAITING: 5,
  },
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

function clearStreamTimeouts(stream) {
  if (stream && stream.name && timeouts[stream.name]) {
    clearTimeout(timeouts[stream.name].retryTimeout);
    clearTimeout(timeouts[stream.name].lostTimeout);
    delete timeouts[stream.name];
  }
}

function removeStream(name) {
  return {
    type: REMOVE_STREAM,
    name,
  };
}

export function closeStream(name, silent = false) {
  return (dispatch) => {
    clearStreamTimeouts({ name });
    if (websockets[name]) {
      websockets[name].silent = silent;
      websockets[name].stop = true;
      websockets[name].close();
    }
    dispatch(removeStream(name));
  };
}

function mergeStreams(oldJSON, newJSON) {
  let result = oldJSON;
  let update = false;
  if (newJSON.subscription) {
    newJSON.subscription.forEach((sub) => {
      if (result.subscription.indexOf(sub) === -1) {
        update = true;
        result.subscription.push(sub);
      }
    });
  }
  if (newJSON.ignore) {
    newJSON.ignore.forEach((sub) => {
      if (result.ignore.indexOf(sub) === -1) {
        update = true;
        result.ignore.push(sub);
      }
    });
  }
  if (result.full !== newJSON.full) {
    update = true;
    result = newJSON.full;
  }
  return update ? result : undefined;
}

function getUrl(options = {}, isEndPoint = false) {
  const service = (isEndPoint ? options.endPoint : options.service) || 'stream';
  const version = Object.prototype.hasOwnProperty.call(options, 'version')
    ? options.version
    : getServiceVersion(service);
  return `${config.baseUrl + (version ? `/${version}` : '')}/${service}`;
}

async function createStream(streamJSON, session, dispatch, options) {
  dispatch(
    updateStream(
      streamJSON.name,
      streamStatus.CONNECTING,
      steps.CONNECTING.UPDATE_STREAM,
      null,
      streamJSON,
    ),
  );
  const response = await request({
    url: getUrl(options),
    method: 'POST',
    body: JSON.stringify(streamJSON),
    headers: { 'x-session': session },
  });
  if (!response.ok) {
    throw response;
  }
  return response.json;
}

function addChildren(message, state) {
  const dataType = message.meta_object.type;
  const data = message[dataType] || message.data;
  const st = schemas.getSchemaTree(dataType);
  if (st.dependencies) {
    const cachedData = state.entities[st.name] && state.entities[st.name][data.meta.id];
    st.dependencies.forEach(({ key, type }) => {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        if (cachedData) {
          data[key] = cachedData[key];
        } else if (type === 'many') {
          data[key] = [];
        } else {
          data[key] = undefined;
        }
      }
    });
  }
}

function startStream(stream, session, getState, dispatch, options, reconnecting) {
  let url = getUrl(options, true);
  if (stream.meta && stream.meta.id) {
    url += `/${stream.meta.id}?x-session=${session}`;
  } else {
    const streamClone = { ...stream };
    delete streamClone.name;
    url += `/open?x-session=${session}&${querystring.stringify(streamClone)}`;
  }
  if (window && window.location && window.location.origin && !url.startsWith('http')) {
    url = window.location.origin + url;
  }
  url = url.replace('http', 'ws');
  const ws = new WebSocket(url);

  websockets[stream.name] = ws;

  dispatch(
    updateStream(
      stream.name,
      reconnecting ? streamStatus.RECONNECTING : streamStatus.CONNECTING,
      steps.CONNECTING.OPENING_SOCKET,
      ws,
      stream,
    ),
  );

  ws.onopen = () => {
    clearStreamTimeouts(stream);
    dispatch(updateStream(stream.name, streamStatus.OPEN, null, ws, stream));
  };

  ws.onmessage = (e) => {
    // a message was received
    try {
      let data = JSON.parse(e.data);
      if (data.constructor !== Array) {
        data = [data];
      }
      data.forEach((message) => {
        const state = getState();
        let parent;
        switch (message.event) {
          case 'create':
            // since stream does not have child list, I'm going to add it from cached store state
            addChildren(message, state);
            if (message.meta_object.type === 'state') {
              const st = schemas.getSchemaTree('state');
              if (
                state.entities[st.name] &&
                Object.prototype.hasOwnProperty.call(
                  state.entities[st.name],
                  message.meta_object.id,
                )
              ) {
                dispatch(
                  addEntities(
                    message.meta_object.type,
                    message[message.meta_object.type] || message.data,
                    { reset: false },
                  ),
                );
              } else {
                parent = getUrlInfo(message.path, 1).parent;
                dispatch(
                  addEntities(
                    message.meta_object.type,
                    [message[message.meta_object.type] || message.data],
                    { reset: false, parent },
                  ),
                );
              }
            } else {
              parent = getUrlInfo(message.path, 1).parent;
              dispatch(
                addEntities(
                  message.meta_object.type,
                  message[message.meta_object.type] || message.data,
                  { reset: false, parent },
                ),
              );
            }
            break;
          case 'update':
            // since stream does not have child list, I'm going to add it from cached store state
            addChildren(message, state);
            dispatch(
              addEntities(
                message.meta_object.type,
                message[message.meta_object.type] || message.data,
                { reset: false },
              ),
            );
            break;
          case 'delete':
            parent = getUrlInfo(message.path, 1).parent;
            dispatch(
              removeEntities(message.meta_object.type, [message.meta_object.id], {
                parent,
              }),
            );
            break;
          default:
            break;
        }
      });
    } catch (error) {
      // console.log('stream catch', error);
    }
  };

  ws.onclose = (e) => {
    if (!ws.stop && e.code !== 4001) {
      timeouts[stream.name] = {};
      const retryTimeout = setTimeout(() => {
        startStream(stream, session, getState, dispatch, options, true);
      }, retryTimer);
      timeouts[stream.name].retryTimeout = retryTimeout;
      if (!reconnecting) {
        const lostTimeout = setTimeout(() => {
          clearStreamTimeouts(stream);
          if (!ws.silent) {
            dispatch(updateStream(stream.name, streamStatus.LOST, null, null, stream));
          }
          if (websockets[stream.name]) {
            websockets[stream.name].stop = true;
            websockets[stream.name].silent = true;
            websockets[stream.name].close();
          }
        }, lostTimer);
        timeouts[stream.name].lostTimeout = lostTimeout;
      }
      if (!ws.silent) {
        dispatch(
          updateStream(
            stream.name,
            streamStatus.RECONNECTING,
            steps.CONNECTING.WAITING,
            ws,
            stream,
            true,
          ),
        );
      }
    } else if (!ws.silent) {
      dispatch(updateStream(stream.name, streamStatus.CLOSED, e.code, ws, stream));
    }
  };

  return ws;
}

export function openStream(streamJSON, session, options) {
  return (dispatch, getState) => {
    let newSession = session;
    if (!streamJSON || !streamJSON.name) {
      throw new Error('openStream requires a name to work');
    }
    if (!newSession) {
      newSession = getState().session && getState().session.meta.id;
    }
    return startStream(streamJSON, newSession, getState, dispatch, options);
  };
}

export function initializeStream(streamJSON = {}, session = undefined, options = undefined) {
  return async (dispatch, getState) => {
    let newSession = session;
    if (!session) {
      newSession = getState().session && getState().session.meta.id;
    }
    if (!newSession) {
      // dispatch no session maybe ?
      throw new Error('no session specified');
    }
    try {
      const streamBaseUrl = getUrl(options);
      dispatch(
        updateStream(
          streamJSON.name,
          streamStatus.CONNECTING,
          steps.CONNECTING.GET_STREAM,
          null,
          streamJSON,
        ),
      );
      const headers = { 'x-session': newSession };
      let url = `${streamBaseUrl}?expand=0`;
      if (streamJSON.name) {
        url += `&this_name=${streamJSON.name}`;
      }
      const response = await request({ method: 'GET', url, headers });
      if (!response.ok) {
        response.url = url;
        throw response;
      }
      const { json } = response;
      if (json.length > 0) {
        const newStreamJSON = {...streamJSON};
        if (!Object.prototype.hasOwnProperty.call(streamJSON, 'full')) {
          newStreamJSON.full = true;
        }
        const stream = json[0];

        // merging with json
        const newJSON = mergeStreams(stream, newStreamJSON);

        if (newJSON) {
          dispatch(
            updateStream(
              streamJSON.name,
              streamStatus.CONNECTING,
              steps.CONNECTING.UPDATE_STREAM,
              null,
              newJSON,
            ),
          );
          const updateResponse = await request({
            url: `${streamBaseUrl}/${stream.meta.id}`,
            method: 'PATCH',
            body: JSON.stringify(newJSON),
            headers,
          });
          if (!updateResponse.ok) {
            throw updateResponse;
          }
        }
        return startStream(newJSON || stream, newSession, getState, dispatch, options);
      }
      const stream = await createStream(streamJSON, newSession, dispatch, options);
      return startStream(stream, newSession, getState, dispatch, options);
    } catch (e) {
      dispatch(updateStream(streamJSON.name, streamStatus.ERROR, null, null, streamJSON));
    }
    return undefined;
  };
}
