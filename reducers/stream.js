import { UPDATE_STREAM, REMOVE_STREAM, status } from "../actions/stream";

const initialState = {};

export default (state = initialState, action) => {
  switch(action.type){
    case UPDATE_STREAM:
      state = Object.assign({}, state);
      switch(action.status){
        case status.RECONNECTING:
          let count = state[action.name].count || 0;
          if(action.retryTimeout){
            count++;
          }
          var retryTimeout = action.retryTimeout || state[action.name].retryTimeout;
          let lostTimeout = action.lostTimout || state[action.name].lostTimeout;
          state[action.name] = {
            name: action.name,
            status: action.status,
            step: action.step,
            ws: action.ws,
            retryTimeout,
            lostTimeout,
            count
          }
          break;
        case status.LOST:
          var retryTimeout = action.retryTimeout || state[action.name].retryTimeout;
          clearTimeout(retryTimeout);
          state[action.name].status = action.status;
          state[action.name].json = action.json
          break;
        case status.CLOSED:
        case status.OPEN:
          clearTimeout(state[action.name].retryTimeout);
          clearTimeout(state[action.name].lostTimeout);
        default:
          state[action.name] = {
            name: action.name,
            status: action.status,
            step: action.step,
            ws: action.ws,
            json: action.json
          }
          break;
      }
      return state;
    case REMOVE_STREAM:
      state = Object.assign({}, state);
      delete state[action.name];
      return state;
  }
  return state;
}
