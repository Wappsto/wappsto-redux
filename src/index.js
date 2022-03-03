import { default as config } from './config';
import './reducers';

export * from './events';
export * from './util';
export * from './selectors';
export * from './actions';
export { default as configureStore } from './configureStore';
export { default as config } from './config';

export function use(newConfig) {
  Object.assign(config, newConfig);
}
