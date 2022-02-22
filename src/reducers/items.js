import { ADD_ITEM, REMOVE_ITEM } from '../actions/items'
import reducerRegistry from '../util/reducerRegistry'

const initialState = {}

export default function reducer(state = initialState, action) {
  let data

  switch (action.type) {
    case ADD_ITEM:
      if (action.data && action.data.constructor === Function) {
        data = action.data(state[action.name])
      } else {
        data = action.data
      }
      return Object.assign({}, state, {
        [action.name]: data,
      })
    case REMOVE_ITEM:
      state = Object.assign({}, state)
      delete state[action.name]
      return state
    default:
      return state
  }
}

reducerRegistry.register('items', reducer)
