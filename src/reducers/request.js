import {
  REQUEST_PENDING,
  REQUEST_ERROR,
  REQUEST_SUCCESS,
  REMOVE_REQUEST,
  STATUS,
} from '../actions/request';

const initialState = {};

function getActionState(action, state, status) {
  const { method, url, json, text, options, id, responseStatus, body, promise } = action;
  return {
    ...state,
    [id]: {
      id,
      status,
      method,
      url,
      body,
      json,
      text,
      responseStatus,
      options,
      promise,
    },
  };
}

function reducer(state = initialState, action = {}) {
  let newState;

  switch (action.type) {
    case REQUEST_PENDING:
      return getActionState(action, state, STATUS.pending);
    case REQUEST_SUCCESS:
      if (state[action.id]) {
        return getActionState(action, state, STATUS.success);
      }
      return state;
    case REQUEST_ERROR:
      if (state[action.id]) {
        return getActionState(action, state, STATUS.error);
      }
      return state;
    case REMOVE_REQUEST:
      newState = { ...state };
      delete newState[action.id];
      return newState;
    default:
      return state;
  }
}

export default reducer;
