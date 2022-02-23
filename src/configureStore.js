import './reducers';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import { REMOVE_SESSION } from './actions/session';
import { cancelAllRequests } from './actions/request';
import { trigger } from './events';

import reducerRegistry from './util/reducerRegistry';

function configureStore(initialState = {}) {
  // Preserve initial state for not-yet-loaded reducers
  const combine = (reducers) => {
    const newReducers = { ...reducers };
    const reducerNames = Object.keys(newReducers);
    Object.keys(initialState).forEach((item) => {
      if (reducerNames.indexOf(item) === -1) {
        newReducers[item] = (state = null) => state;
      }
    });
    const appReducer = combineReducers(newReducers);
    return function rootReducer(state, action) {
      let newState = { ...state };
      if (action.type === REMOVE_SESSION) {
        newState = undefined;
        cancelAllRequests();
        trigger('logout');
      }
      return appReducer(newState, action);
    };
  };

  const store = createStore(
    combine(reducerRegistry.getReducers()),
    initialState,
    applyMiddleware(thunk),
  );

  // Replace the store's reducer whenever a new reducer is registered.
  reducerRegistry.setChangeListener((reducers) => {
    store.replaceReducer(combine(reducers));
  });

  return store;
}

export default configureStore;
