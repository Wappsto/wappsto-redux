import { UPDATE_STREAM, REMOVE_STREAM, status } from '../actions/stream';
import reducerRegistry from '../util/reducerRegistry';

const initialState = {};

function reconnect(state, action) {
  state = Object.assign({}, state);
  let count = (state[action.name] && state[action.name].count) || 0;
  if (action.increment) {
    count++;
  }
  state[action.name] = {
    ...(state[action.name] || {}),
    ...action,
    count
  };
  delete state[action.name].type;
}

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case UPDATE_STREAM:
      switch (action.status) {
        case status.RECONNECTING:
          reconnect(state, action);
          break;
        default:
          state = Object.assign({}, state);
          state[action.name] = {
            ...(state[action.name] || {}),
            ...action
          };
          delete state[action.name].type;
          break;
      }
      return state;
    case REMOVE_STREAM:
      state = Object.assign({}, state);
      delete state[action.name];
      return state;
    default:
      return state;
  }
}

reducerRegistry.register('stream', reducer);
