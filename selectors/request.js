import { createSelector } from "reselect";
import querystring from "querystring";

const stateSelector = state => state.request;

export const makeRequestSelector = () => createSelector(
  stateSelector,
  (_, id) => id,
  (requests, id) => requests[id]
)
