import {
  ADD_ITEM,
  REMOVE_ITEM
} from "../actions/items";
import reducerRegistry from "../util/reducerRegistry";

const initialState = {};

export default function reducer(state = initialState, action){
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

reducerRegistry.register("items", reducer);
