import {
  ADD_SESSION,
  REMOVE_SESSION,
  INVALID_SESSION
} from "../actions/session";

const initialState = {};

export default (state = initialState, action) => {
  switch(action.type){
    case ADD_SESSION:
      return Object.assign({}, state, action.data, { valid: true });
    case REMOVE_SESSION:
      return {};
    case INVALID_SESSION:
      return Object.assign({}, state, {
        valid: false
      });
  }
  return state;
}
