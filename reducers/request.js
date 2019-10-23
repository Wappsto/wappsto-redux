import {
  REQUEST_PENDING,
  REQUEST_ERROR,
  REQUEST_SUCCESS,
  REMOVE_REQUEST
} from "../actions/request";
import reducerRegistry from "../util/reducerRegistry";

const initialState = {};

function getActionState(action, state, status){
  let { method, url, json, options, id, responseStatus, body } = action;
  return Object.assign({}, state, {
    [id]: {
      id,
      status,
      method,
      url,
      body,
      json,
      responseStatus,
      options
    }
  });
}

export default function reducer(state = initialState, action){
  switch(action.type){
    case REQUEST_PENDING:
      return getActionState(action, state, "pending");
    case REQUEST_SUCCESS:
      return getActionState(action, state, "success");
    case REQUEST_ERROR:
      return getActionState(action, state, "error");
    case REMOVE_REQUEST:
      state = Object.assign({}, state);
      delete state[action.id];
      return state;
    default:
      return state;
  }
}

reducerRegistry.register("request", reducer);
