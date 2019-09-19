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

const getRequestError = (state, url, method, query) => {
  const urlKey = getUrlKey(url, method, query);
  return state.request.errors[method + "_" + urlKey];
}

const getRequestAndError = (state, url, method, query) => {
  let request;
  const error = getRequestError(state, url, method, query);
  const urlKey = getUrlKey(url, method, query);
  if(state.request[urlKey] && state.request[urlKey].method === method){
    request = state.request[urlKey];
  }
  return {
    request,
    error
  };
}

export const getRequest = (state, url, method, query) => {
  method = method.toUpperCase();
  if(method){
    let result = getRequestAndError(state, url, method, query);
    return result.error || result.request;
  } else {
    return state.request[url];
  }
}
