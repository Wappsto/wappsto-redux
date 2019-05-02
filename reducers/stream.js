import { UPDATE_STREAM } from "../actions/stream";

const initialState = {};

export default (state = initialState, action) => {
  switch(action.type){
    case UPDATE_STREAM:
      state = Object.assign({}, state);
      state[action.name] = {
        name: action.name,
        status: action.status,
        step: action.step,
        ws: action.ws
      }
      return state;
  }
  return state;
}
