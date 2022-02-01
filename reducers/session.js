import {
  ADD_SESSION,
  REMOVE_SESSION,
  INVALID_SESSION,
  LIMIT_REACHED,
} from '../actions/session'
import reducerRegistry from '../util/reducerRegistry'

const initialState = null

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case ADD_SESSION:
      return Object.assign({}, state, action.data, { valid: true })
    case REMOVE_SESSION:
      return initialState
    case INVALID_SESSION:
      if (state && state.meta && state.meta.id) {
        return Object.assign({}, state, {
          valid: false,
        })
      }
      return state
    case LIMIT_REACHED:
      if (state && state.meta && state.meta.id) {
        return Object.assign({}, state, {
          limitReached: true,
        })
      }
      return state
    default:
      return state
  }
}

reducerRegistry.register('session', reducer)
