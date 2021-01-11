import config from './config';
export { default as configureStore } from './configureStore';
export { overrideRequest } from './actions/request';

export function use(newConfig){
  Object.assign(config, newConfig);
}
