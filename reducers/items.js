import {
  ADD_ITEM,
  REMOVE_ITEM
} from "../actions/items";

const initialState = {};

export default (state = initialState, action) => {
  switch(action.type){
    case ADD_ITEM:
      return Object.assign({}, state, {
        [action.name]: action.data
      });
    case REMOVE_ITEM:
      state = Object.assign({}, state);
      delete state[action.name];
      return state;
  }
  return state;
}
