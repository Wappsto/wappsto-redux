import { createSelector } from 'reselect';

const stateSelector = (state) => state.request;

const makeRequestSelector = () =>
  createSelector(
    stateSelector,
    (_, id) => id,
    (requests, id) => requests[id],
  );

export default makeRequestSelector;
