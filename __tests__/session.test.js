import {
  configureStore,
  getSession,
  addSession,
  removeSession,
  invalidSession,
  limitReached,
} from '../src'

describe('session', () => {
  let store
  const jsonSession = {
    meta: {
      id: 'bc09f773-001a-4c36-a7d9-bb6dfbfafc02',
    },
  }

  beforeEach(() => {
    store = configureStore()
  })

  it('can get an empty session', () => {
    const session = getSession(store.getState())
    expect(session).toBe(null)
  })

  it('can add a session', () => {
    store.dispatch(addSession(jsonSession))
    const session = getSession(store.getState())
    expect(session.meta.id).toBe('bc09f773-001a-4c36-a7d9-bb6dfbfafc02')
    expect(session.valid).toBe(true)
  })

  it('can remove a session', () => {
    store.dispatch(addSession(jsonSession))
    store.dispatch(removeSession())
    const session = getSession(store.getState())
    expect(session).toBe(null)
  })

  it('can invalidate a session', () => {
    store.dispatch(addSession(jsonSession))
    store.dispatch(invalidSession())
    const session = getSession(store.getState())
    expect(session.valid).toBe(false)
  })

  it('can mark a session with limit reached', () => {
    store.dispatch(addSession(jsonSession))
    store.dispatch(limitReached())
    const session = getSession(store.getState())
    expect(session.valid).toBe(true)
    expect(session.limitReached).toBe(true)
  })

  it('can handle invalid event', () => {
    store.dispatch(addSession(jsonSession))
    store.dispatch({ type: 'wrong' })
    const session = getSession(store.getState())
    expect(session.meta.id).toBe('bc09f773-001a-4c36-a7d9-bb6dfbfafc02')
    expect(session.valid).toBe(true)
  })

  it('can handle events after it has removed', () => {
    store.dispatch(addSession(jsonSession))
    store.dispatch(removeSession())
    store.dispatch(invalidSession())
    store.dispatch(limitReached())
    const session = getSession(store.getState())
    expect(session).toBe(null)
  })
})
