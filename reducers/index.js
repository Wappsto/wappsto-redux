import { combineReducers } from 'redux';

import request from './request';
import entities from './entities';
import items from './items';
import pagination from './pagination';
import session from './session';
import stream from './stream';

import { REMOVE_SESSION } from '../actions/session';

const appReducer = combineReducers({
  request,
  entities,
  items,
  pagination,
  session,
  stream
});

export default function rootReducer(state, action){
  if (action.type === REMOVE_SESSION) {
    state = undefined;
  }
  return appReducer(state, action)
}
