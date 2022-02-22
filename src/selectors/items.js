import { createSelector } from 'reselect'

const stateSelector = (state) => state.items

export const getItem = (state, name) => {
  return state.items[name]
}

export const makeItemSelector = () =>
  createSelector(
    stateSelector,
    (_, name) => name,
    (items, name) => items[name]
  )
