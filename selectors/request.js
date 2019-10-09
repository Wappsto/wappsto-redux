import { createSelector } from "reselect";
import querystring from 'querystring';

function getUrlKey(url, method, query){
  if(method === 'GET'){
    const qs = querystring.stringify(query);
    if(qs){
      url += '?' + qs;
    }
  }
  return url;
}

const stateSelector = state => state.request;

const getRequestError = (requests, method, urlKey) => {
  return requests.errors[method + "_" + urlKey];
}

const getRequestAndError = (requests, url, method, query) => {
  let request;
  const urlKey = getUrlKey(url, method, query);
  const error = getRequestError(requests, method, urlKey);
  if(requests[urlKey] && requests[urlKey].method === method){
    request = requests[urlKey];
  }
  return {
    request,
    error
  };
}

const getRequest = (requests, url, method, query) => {
  method = method.toUpperCase();
  if(method){
    let result = getRequestAndError(requests, url, method, query);
    return result.error || result.request;
  } else {
    return requests[url];
  }
}

export const makeRequestSelector = () => createSelector(
  stateSelector,
  (_, url) => url,
  (_, _1, method) => method,
  (_, _1, _2, query) => query,
  getRequest
)

const getRequestById = (obj, id) => {
  for(let key in obj){
    if(key !== 'errors' && obj[key] && obj[key].id === id){
      return obj[key];
    }
  }
  return undefined;
}

export const makeRequestIdSelector = () => createSelector(
  stateSelector,
  (_, id) => id,
  (requests, id) => {
    let request;
    if(id){
      request = getRequestById(requests, id);
      if(!request){
        request = getRequestById(requests.errors, id);
      }
    }
    return request;
  }
)
