import { applyMiddleware, createStore } from 'redux';

import thunk from 'redux-thunk';

import reducers from './reducers';

import { useStore } from './stream';

export default function configureStore(preloadedState) {
  let store = createStore(
    reducers,
    preloadedState,
    applyMiddleware(thunk)
  );
  useStore(store);
  return store;
}
