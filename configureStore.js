import { applyMiddleware, createStore } from 'redux';

import thunk from 'redux-thunk';

import reducers from './reducers';

export default function configureStore(preloadedState) {
  let store = createStore(
    reducers,
    preloadedState,
    applyMiddleware(thunk)
  );
  return store;
}
