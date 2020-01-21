import querystring from 'querystring';
import config from '../config';
import { getUrlInfo, getServiceVersion } from '../util/helpers';
import { addEntities, removeEntities } from './entities';
import { addSession, invalidSession, removeSession } from './session';

export const REQUEST_PENDING = 'REQUEST_PENDING';
export const REQUEST_ERROR = 'REQUEST_ERROR';
export const REQUEST_SUCCESS = 'REQUEST_SUCCESS';
export const REMOVE_REQUEST = 'REMOVE_REQUEST';

function getQueryObj(query) {
	var urlParams = {};
  var match,
      pl     = /\+/g,
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };

  while ((match = search.exec(query)))
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
  if(['PUT' , 'PATCH', 'POST'].indexOf(method) !== -1){
    requestOptions.body = JSON.stringify(data);
  }
  requestOptions.url = getUrlWithQuery(url, options);
  return requestOptions;
}

function requestPending(id, method, url, body, options) {
  return {
    type: REQUEST_PENDING,
		id,
    method,
    url,
    body,
    options
  }
}

function requestSuccess(id, method, url, body, responseStatus, json, options){
  return {
    type: REQUEST_SUCCESS,
		id,
    method,
    url,
		body,
    responseStatus,
    json,
    options
  }
}

function requestError(id, method, url, body, responseStatus, json, options){
  return {
    type: REQUEST_ERROR,
		id,
    method,
    url,
		body,
    responseStatus,
    json,
    options
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
      dispatch(removeEntities(service, json.deleted, { ...options, parent, reset: false }));
			if(json.shared_deleted){
				dispatch(removeEntities(service, json.shared_deleted, { ...options, parent, reset: false }));
			}
      break;
		default:
			break;
  }
}

function dispatchSessionAction(dispatch, method, url, json, options){
  if(method === 'DELETE'){
    dispatch(removeSession());
  } else {
    dispatch(addSession(json, true));
  }
}

function dispatchMethodAction(dispatch, method, url, json, options){
	const { service, parent } = getUrlInfo(url);
  if(service === 'session'){
    dispatchSessionAction(dispatch, method, url, json, options);
  } else {
    dispatchEntitiesAction(dispatch, method, url, json, options, service, parent);
  }
}

export let _request = async (options) => {
  try{
    let response = await fetch(options.url, options);
    try{
      let json = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        json
      };
    }catch(e){
      return { ok: response.ok, status: response.status };
    }
  } catch(e){
    return { ok: false, status: e.status };
  }
};

async function startRequest(dispatch, id, url, data, options, requestOptions){
	dispatch(requestPending(id, requestOptions.method, url, data, options));
	let response;
	try{
		response = await _request(requestOptions);
	} catch(e){
		response = e;
	}
	if(response.ok){
		dispatchMethodAction(dispatch, requestOptions.method, url, response.json, options);
		dispatch(requestSuccess(id, requestOptions.method, url, data, response.status, response.json, options));
	} else {
		if(response.json && response.json.code === 9900025){
			dispatch(invalidSession());
		}
		dispatch(requestError(id, requestOptions.method, url, data, response.status, response.json, options));
	}
}

let nextId = 1;
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
		const requestOptions = getOptions(method, result.url, data, result.options, state.session);
		const id = nextId;
		nextId += 1;
		startRequest(dispatch, id, url, data, options, requestOptions);
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
