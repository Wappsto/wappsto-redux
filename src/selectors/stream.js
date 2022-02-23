import { createSelector } from 'reselect';

const stateSelector = (state) => state.stream;

export const makeStreamSelector = () =>
  createSelector(
    stateSelector,
    (_, name) => name,
    (streams, name) => streams[name]
  );
