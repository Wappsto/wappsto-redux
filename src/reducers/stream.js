import { UPDATE_STREAM, REMOVE_STREAM, streamStatus } from '../actions/stream';

const initialState = {};

function reconnect(state, action) {
  const newState = { ...state };
  let count = (newState[action.name] && newState[action.name].count) || 0;
  if (action.increment) {
    count += 1;
  }
  newState[action.name] = {
    ...(newState[action.name] || {}),
    ...action,
    count,
  };
  delete newState[action.name].type;
  return newState;
}

function reducer(state = initialState, action = {}) {
  let newState;

  switch (action.type) {
    case UPDATE_STREAM:
      switch (action.status) {
        case streamStatus.RECONNECTING:
          newState = reconnect(state, action);
          break;
        default:
          newState = { ...state };
          newState[action.name] = {
            ...(newState[action.name] || {}),
            ...action,
          };
          delete newState[action.name].type;
          break;
      }
      return newState;
    case REMOVE_STREAM:
      newState = { ...state };
      delete newState[action.name];
      return newState;
    default:
      return state;
  }
}

export default reducer;
