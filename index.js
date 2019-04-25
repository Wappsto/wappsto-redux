import config from './config';
import configureStore from './configureStore';

export let _request;

export { configureStore };

export function use(newConfig){
  Object.assign(config, newConfig);
}

export function request(func){
  _request = func;
}
