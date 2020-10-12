import {
  ADD_SESSION,
  REMOVE_SESSION,
  INVALID_SESSION
} from "../actions/session";
import reducerRegistry from "../util/reducerRegistry";

const initialState = null;

export default function reducer(state = initialState, action){
  switch(action.type){
    case ADD_SESSION:
      return Object.assign({}, state, action.data, { valid: true });
    case REMOVE_SESSION:
      return initialState;
    case INVALID_SESSION:
      return Object.assign({}, state, {
        valid: false
      });
    default:
      return state;
  }
}

reducerRegistry.register("session", reducer);
