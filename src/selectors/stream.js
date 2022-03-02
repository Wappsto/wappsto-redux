import { createSelector } from 'reselect';

const stateSelector = (state) => state.stream;

const makeStreamSelector = () =>
  createSelector(
    stateSelector,
    (_, name) => name,
    (streams, name) => streams[name],
  );

export default makeStreamSelector;
