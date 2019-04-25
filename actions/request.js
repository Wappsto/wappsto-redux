import querystring from "querystring";

import { _request } from "../index";

import config from "../config";
import { isUUID, getUrlInfo } from "../util/helpers";
import { addEntities, removeEntities } from "./entities";
import { addSession, invalidSession, removeSession } from "./session";

export const REQUEST_PENDING = 'REQUEST_PENDING';
export const REQUEST_ERROR = 'REQUEST_ERROR';
export const REQUEST_SUCCESS = 'REQUEST_SUCCESS';
export const REMOVE_REQUEST = 'REMOVE_REQUEST';
export const REMOVE_REQUEST_ERROR = 'REMOVE_REQUEST_ERROR';

function getUrl(url, query = {}){
  let result = config.baseUrl + url;
  if(Object.keys(query).length > 0){
    result += result.indexOf("?") === -1 ? "?": "&";
    result += querystring.stringify(query);
  }
  return result;
}

function getOptions(method, url, data, options, sessionJSON){
  let requestOptions = {method, headers: options.headers || {}};
  if(sessionJSON && sessionJSON.meta && !requestOptions.headers['x-session']){
      requestOptions.headers['x-session'] = sessionJSON.meta.id;
  }
  if(["PUT" , "PATCH", "POST"].indexOf(method) !== -1){
    requestOptions.body = JSON.stringify(data);
  }
  requestOptions.url = getUrl(url, options.query);
  return requestOptions;
}

function requestPending(method, url, body, options) {
  return {
    type: REQUEST_PENDING,
    method,
    url,
    body,
    options
  }
}

function requestSuccess(method, url, json, options){
  return {
    type: REQUEST_SUCCESS,
    method,
    url,
    json,
    options
  }
}

function requestError(method, url, responseStatus, json, options){
  return {
    type: REQUEST_ERROR,
    method,
    url,
    responseStatus,
    json,
    options
  }
}

function dispatchEntitiesAction(dispatch, method, url, json, options){
  let { service, id, parent } = getUrlInfo(url);
  switch(method){
    case "GET":
      dispatch(addEntities(service, json, { reset: false, ...options, parent }));
      break;
    case "POST":
    case "PATCH":
    case "PUT":
      dispatch(addEntities(service, json, { ...options, parent, reset: false }));
      break;
    case "DELETE":
      dispatch(removeEntities(service, json.deleted, { ...options, parent, reset: false }));
      break;
  }
}

function dispatchSessionAction(dispatch, method, url, json, options){
  if(method === "DELETE"){
    dispatch(removeSession());
  } else {
    dispatch(addSession(json, true));
  }
}

function dispatchMethodAction(dispatch, method, url, json, options){
  if(url.startsWith("/session")){
    dispatchSessionAction(dispatch, method, url, json, options);
  } else {
    dispatchEntitiesAction(dispatch, method, url, json, options);
  }
}

export function makeRequest(method, url, data, options = {}) {
  return (dispatch, getStore) => {
    if(!_request){
      console.log("request function is not set");
      return;
    }
    method = method.toUpperCase();
    let store = getStore();
    if(store.request[url] && store.request[url].status === "pending"){
      console.log("a request with the same url is already pending");
      return;
    }
    dispatch(requestPending(method, url, data, options));
    let requestOptions = getOptions(method, url, data, options, store.session);
    // console.log(requestOptions);
    return _request(
      requestOptions,
      (json) => {
        dispatchMethodAction(dispatch, method, url, json, options);
        dispatch(requestSuccess(method, url, json, options));
      },
      (status, json = {}) => {
        if(json.code === 9900025){
          dispatch(invalidSession());
        }
        dispatch(requestError(method, url, status, json, options));
      }
    )
  };
}

export function removeRequest(url, method){
  return {
    type: REMOVE_REQUEST,
    url,
    method
  }
}

export function removeRequestError(url, method){
  return {
    type: REMOVE_REQUEST_ERROR,
    url,
    method
  }
}
