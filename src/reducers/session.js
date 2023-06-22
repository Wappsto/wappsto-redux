import { ADD_SESSION, REMOVE_SESSION, INVALID_SESSION, LIMIT_REACHED } from '../actions/session';

const initialState = null;

function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case ADD_SESSION:
      if (action.data.meta.type !== 'session') {
        return state;
      }
      return { ...state, ...action.data, valid: true };
    case REMOVE_SESSION:
      return initialState;
    case INVALID_SESSION:
      if (state && state.meta && state.meta.id) {
        return { ...state, valid: false };
      }
      return state;
    case LIMIT_REACHED:
      if (state && state.meta && state.meta.id) {
        return { ...state, limitReached: true };
      }
      return state;
    default:
      return state;
  }
}

export default reducer;
