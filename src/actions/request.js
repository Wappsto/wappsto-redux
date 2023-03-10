import querystring from 'query-string';
import equal from 'deep-equal';
import config from '../config';
import { getUrlInfo, getServiceVersion } from '../util/helpers';
import { addEntities, removeEntities } from './entities';
import { invalidSession, limitReached } from './session';
// import 'core-js/stable';
import 'regenerator-runtime/runtime';

export const REQUEST_PENDING = 'REQUEST_PENDING';
export const REQUEST_ERROR = 'REQUEST_ERROR';
export const REQUEST_SUCCESS = 'REQUEST_SUCCESS';
export const REMOVE_REQUEST = 'REMOVE_REQUEST';

export const STATUS = {
  pending: 'pending',
  success: 'success',
  error: 'error',
};

const pendingRequestsCache = {};
let nextPendingId = 0;

function getQueryObj(query) {
  const urlParams = {};
  const pl = /\+/g;
  const search = /([^&=]+)=?([^&]*)/g;
  const decode = function decode(s) {
    return decodeURIComponent(s.replace(pl, ' '));
  };

  let match = search.exec(query);
  while (match) {
    const left = decode(match[1]);
    const right = decode(match[2]);
    if (Object.prototype.hasOwnProperty.call(urlParams, left)) {
      if (urlParams[left].constructor !== Array) {
        urlParams[left] = [urlParams[left]];
      }
      urlParams[left].push(right);
    } else {
      urlParams[left] = right;
    }
    match = search.exec(query);
  }

  return urlParams;
}

function splitUrlAndOptions(url, options) {
  const newOptions = { ...options };
  const split = url.split('?');
  if (split[1]) {
    const query = split.slice(1).join('?');
    if (!newOptions.query) {
      newOptions.query = getQueryObj(query);
    } else {
      newOptions.query = {
        ...newOptions.query,
        ...getQueryObj(query),
      };
    }
  }
  return {
    url: split[0],
    options: newOptions,
  };
}

function getUrlWithQuery(url, options) {
  const { service } = getUrlInfo(url);
  const version = options.version || getServiceVersion(service);
  if(url.startsWith('http')) {
    return url;
  }
  let result = config.baseUrl + (version ? `/${version}` : '') + url;
  if (options.query && Object.keys(options.query).length > 0) {
    result += result.indexOf('?') === -1 ? '?' : '&';
    result += querystring.stringify(options.query);
  }
  return result;
}

function getOptions(method, url, data, options, sessionJSON) {
  const requestOptions = {
    method,
    headers: options.headers || {},
    rawOptions: { ...options },
  };
  if (sessionJSON && sessionJSON.meta && !requestOptions.headers['x-session']) {
    requestOptions.headers['x-session'] = sessionJSON.meta.id;
  }
  if (['GET', 'DELETE'].indexOf(method) === -1) {
    requestOptions.body = JSON.stringify(data);
  }
  requestOptions.url = getUrlWithQuery(url, options);
  return requestOptions;
}

function requestPending(id, method, url, body, options, promise) {
  return {
    type: REQUEST_PENDING,
    id,
    method,
    url,
    body,
    options,
    promise,
  };
}

function requestSuccess(id, method, url, body, responseStatus, json, text, options, promise) {
  return {
    type: REQUEST_SUCCESS,
    id,
    method,
    url,
    body,
    responseStatus,
    json,
    text,
    options,
    promise,
  };
}

function requestError(id, method, url, body, responseStatus, json, text, options, promise) {
  return {
    type: REQUEST_ERROR,
    id,
    method,
    url,
    body,
    responseStatus,
    json,
    text,
    options,
    promise,
  };
}

function dispatchEntitiesAction(dispatch, method, url, json, options, service, parent) {
  let deleted;

  switch (method) {
    case 'GET':
      dispatch(addEntities(service, json, { reset: false, ...options, parent }));
      break;
    case 'POST':
    case 'PATCH':
    case 'PUT':
      dispatch(addEntities(service, json, { ...options, parent, reset: false }));
      break;
    case 'DELETE':
      deleted = [
        ...(json.deleted || []),
        ...(json.shared_deleted || []),
        ...(json.owned_deleted || []),
      ];
      if (deleted.length > 0) {
        dispatch(removeEntities(service, deleted, { ...options, parent, reset: false }));
      }
      break;
    default:
      /* istanbul ignore next */
      break;
  }
}

function dispatchMethodAction(dispatch, method, url, json, options) {
  const { service, parent } = getUrlInfo(url);
  if (service === 'document' && url.startsWith('/file/')) {
    dispatchEntitiesAction(dispatch, method, url, json, options, 'file');
  } else if (service !== 'file') {
    dispatchEntitiesAction(dispatch, method, url, json, options, service, parent);
  }
}

let localRequest = async (options) => {
  try {
    // eslint-disable-next-line no-param-reassign
    options.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (!options.controller || !options.controller.signal) {
      // eslint-disable-next-line no-param-reassign
      options.controller = new AbortController();
    }
    // eslint-disable-next-line no-param-reassign
    options.signal = options.controller.signal;
    const response = await fetch(options.url, options);
    try {
      const json = await response.clone().json();
      return {
        ok: response.ok,
        status: response.status,
        json,
        options,
        rawResponse: response,
      };
    } catch (e) {
      const text = await response.clone().text();
      return {
        ok: response.ok,
        status: response.status,
        text,
        options,
        rawResponse: response,
      };
    }
  } catch (e) {
    return { ok: false, status: e.status, options };
  }
};

export const request = async (options) => localRequest(options);

function findRequest(url, method, data, options = {}) {
  for (let i = 0; i < Object.keys(pendingRequestsCache).length; i += 1) {
    const id = Object.keys(pendingRequestsCache)[i];
    const pendingRequest = pendingRequestsCache[id];
    const rUrl = querystring.parseUrl(pendingRequest.url);
    const parsedUrl = querystring.parseUrl(url);
    const rQuery = {
      ...pendingRequest.query,
      ...rUrl.query,
      ...(pendingRequest.options.query || {}),
    };
    const query = options.query ? { ...options.query, ...parsedUrl.query } : parsedUrl.query;
    if (
      pendingRequest.method === method &&
      equal(rUrl.url, parsedUrl.url) &&
      equal(rQuery, query) &&
      equal(pendingRequest.body, data)
    ) {
      return pendingRequest.promise;
    }
  }
  return undefined;
}

export function startRequest(dispatch, options, session) {
  let promise;
  let pendingId;
  const { url, id } = options;
  const data = options.data || options.body;
  const method = options.method ? options.method.toUpperCase() : 'GET';
  const result = splitUrlAndOptions(url, options);
  const requestOptions = getOptions(method, url, data, options, session);
  if (id) {
    pendingId = id;
  } else {
    pendingId = nextPendingId;
    nextPendingId += 1;
  }

  const checkResponse = (response) => {
    if(!response) {
      return response;
    }
    delete pendingRequestsCache[pendingId];
    if (response.ok) {
      if (options.dispatchEntities !== false) {
        dispatchMethodAction(
          dispatch,
          requestOptions.method,
          result.url,
          response.json,
          result.options,
        );
      }
      if (id) {
        dispatch(
          requestSuccess(
            id,
            requestOptions.method,
            result.url,
            data,
            response.status,
            response.json,
            response.text,
            result.options,
            promise,
          ),
        );
      }
    } else {
      if (response.json) {
        if (response.json.code === 117000000) {
          dispatch(invalidSession());
        } else if (response.json.code === 300098) {
          dispatch(limitReached());
        }
      }
      if (id) {
        dispatch(
          requestError(
            id,
            requestOptions.method,
            result.url,
            data,
            response.status,
            response.json,
            response.text,
            result.options,
            promise,
          ),
        );
      }
    }
    return response;
  };

  promise = findRequest(url, method, data, options);
  if (!promise) {
    promise = localRequest(requestOptions);
  }
  promise.then(checkResponse).catch(checkResponse);

  result.options.controller = requestOptions.controller;
  const requestPendingObj = requestPending(
    pendingId,
    requestOptions.method,
    result.url,
    data,
    result.options,
    promise,
  );
  pendingRequestsCache[pendingId] = requestPendingObj;
  if (id) {
    dispatch(requestPendingObj);
  }
  return promise;
}

export function makeRequest(options = {}) {
  return (dispatch, getState) => {
    const state = getState();
    const promise = startRequest(dispatch, options, state.session);
    return promise;
  };
}

export function removeRequest(id) {
  return {
    type: REMOVE_REQUEST,
    id,
  };
}

export function overrideRequest(func) {
  if (func) {
    localRequest = func;
  }
}

export function cancelAllRequests() {
  Object.keys(pendingRequestsCache).forEach((key) => {
    if (pendingRequestsCache[key].options.abortable !== false &&
        pendingRequestsCache[key].options.controller) {
      pendingRequestsCache[key].options.controller.abort();
    }
  });
}
