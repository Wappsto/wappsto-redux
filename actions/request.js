import querystring from 'query-string';
import equal from 'deep-equal';
import config from '../config';
import { getUrlInfo, getServiceVersion } from '../util/helpers';
import { addEntities, removeEntities } from './entities';
import { addSession, invalidSession, removeSession } from './session';

export const REQUEST_PENDING = 'REQUEST_PENDING';
export const REQUEST_ERROR = 'REQUEST_ERROR';
export const REQUEST_SUCCESS = 'REQUEST_SUCCESS';
export const REMOVE_REQUEST = 'REMOVE_REQUEST';

export const STATUS = {
  pending: 'pending',
  success: 'success',
  error: 'error'
}

function getQueryObj(query) {
	var urlParams = {};
  var match,
      pl     = /\+/g,
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };

  while (match = search.exec(query))
     urlParams[decode(match[1])] = decode(match[2]);
	return urlParams;
}

function splitUrlAndOptions(url, options){
  let newOptions = { ...options };
  let split = url.split("?");
  if(split[1]){
    let query = split.slice(1).join("?");
    if(!newOptions.query){
      newOptions.query = getQueryObj(query);
    } else {
      newOptions.query = {
        ...newOptions.query,
        ...getQueryObj(query)
      }
    }
  }
  return {
    url: split[0],
    options: newOptions
  }
}

function getUrlWithQuery(url, options){
	const { service } = getUrlInfo(url);
	const version = options.version || getServiceVersion(service);
  let result = config.baseUrl + (version ? '/' + version : '') + url;
  if(options.query && Object.keys(options.query).length > 0){
		result += result.indexOf('?') === -1 ? '?': '&';
    result += querystring.stringify(options.query);
	}
  return result;
}

function getOptions(method, url, data, options, sessionJSON){
  let requestOptions = {method, headers: options.headers || {}};
  if(sessionJSON && sessionJSON.meta && !requestOptions.headers['x-session']){
      requestOptions.headers['x-session'] = sessionJSON.meta.id;
  }
  if(['GET', 'DELETE'].indexOf(method) === -1){
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
    promise
  }
}

function requestSuccess(id, method, url, body, responseStatus, json, text, options, promise){
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
    promise
  }
}

function requestError(id, method, url, body, responseStatus, json, text, options, promise){
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
    promise
  }
}

function dispatchEntitiesAction(dispatch, method, url, json, options, service, parent){
  switch(method){
    case 'GET':
      dispatch(addEntities(service, json, { reset: false, ...options, parent }));
      break;
    case 'POST':
    case 'PATCH':
    case 'PUT':
      dispatch(addEntities(service, json, { ...options, parent, reset: false }));
      break;
    case 'DELETE':
			const deleted = [...(json.deleted || []), ...(json.shared_deleted || [])];
      if(deleted.length > 0){
				dispatch(removeEntities(service, deleted, { ...options, parent, reset: false }));
			}
      break;
		default:
			break;
  }
}

function dispatchMethodAction(dispatch, method, url, json, options){
	const { service, parent } = getUrlInfo(url);
  if(service === 'document' && url.startsWith('/file/')){
    dispatchEntitiesAction(dispatch, method, url, json, options, 'file');
  } else if(service !== 'file'){
    dispatchEntitiesAction(dispatch, method, url, json, options, service, parent);
  }
}

export let _request = async (options) => {
  try{
    options.headers = {
      'Accept' : 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }
    const response = await fetch(options.url, options);
    try{
      const json = await response.clone().json();
      return {
        ok: response.ok,
        status: response.status,
        json
      };
    }catch(e){
      const text = await response.clone().text();
      return { ok: response.ok, status: response.status, text };
    }
  } catch(e){
    return { ok: false, status: e.status };
  }
};

export function findRequest(state, url, method, data, options = {}) {
  for (let id in state.request) {
    const stateRequest = state.request[id];
    const rUrl = querystring.parseUrl(stateRequest.url);
    const parsedUrl = querystring.parseUrl(url);
    const rQuery = { ...stateRequest.query, ...rUrl.query, ...(stateRequest.options.query || {}) };
    const query = options.query ? { ...options.query, ...parsedUrl.query } : parsedUrl.query;
    if (stateRequest.status === 'pending'
		&& stateRequest.method === method
		&& equal(rUrl.url, parsedUrl.url)
		&& equal(rQuery, query)
		&& equal(stateRequest.data, data)) {
      return stateRequest.id;
    }
  }
}

let nextId = 1;
export function startRequest(dispatch, url, method, data, options, session){
  let promise;
  const requestOptions = getOptions(method, url, data, options, session);
  const id = nextId;
  nextId += 1;

  const checkResponse = (response) => {
    if(response.ok){
      dispatchMethodAction(dispatch, requestOptions.method, url, response.json, options);
      dispatch(requestSuccess(id, requestOptions.method, url, data, response.status, response.json, response.text, options, promise));
    } else {
      if(response.json && response.json.code === 117000000){
        dispatch(invalidSession());
      }
      dispatch(requestError(id, requestOptions.method, url, data, response.status, response.json, response.text, options, promise));
    }
    return response;
  }

  promise = _request(requestOptions).then(checkResponse).catch(checkResponse);
  dispatch(requestPending(id, requestOptions.method, url, data, options, promise));
  return {id, promise};
}

export function makeRequest(method, url, data, options = {}) {
  return (dispatch, getState) => {
    if(method.constructor === Object){
      data = method.data || method.body;
      url = method.url;
      options = method;
      method = method.method;
    }
    if(!_request){
      console.log('request function is not set');
      return;
    }
    method = method.toUpperCase();
    const result = splitUrlAndOptions(url, options);
    const state = getState();
    const existingRequest = findRequest(state, url, method, data, options);
    if (existingRequest) {
      return existingRequest;
    }
		const { id } = startRequest(dispatch, result.url, method, data, result.options, state.session);
		return id;
  };
}

export function removeRequest(id){
  return {
    type: REMOVE_REQUEST,
    id
  }
}

export function overrideRequest(func){
  _request = func;
}
