import { ADD_ITEM, REMOVE_ITEM } from '../actions/items';

const initialState = {};

function reducer(state = initialState, action = {}) {
  let data;
  let newState;

  switch (action.type) {
    case ADD_ITEM:
      if (action.data && action.data.constructor === Function) {
        data = action.data(state[action.name]);
      } else {
        data = action.data;
      }
      return { ...state, [action.name]: data };
    case REMOVE_ITEM:
      newState = { ...state };
      delete newState[action.name];
      return newState;
    default:
      return state;
  }
}

export default reducer;
