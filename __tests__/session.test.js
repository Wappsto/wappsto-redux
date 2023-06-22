import {
  configureStore,
  getSession,
  addSession,
  removeSession,
  invalidSession,
  limitReached,
} from '../src';

describe('session', () => {
  let store;
  const jsonSession = {
    meta: {
      type: 'session',
      id: 'bc09f773-001a-4c36-a7d9-bb6dfbfafc02',
    },
  };

  beforeEach(() => {
    store = configureStore();
  });

  it('can get an empty session', () => {
    const session = getSession(store.getState());
    expect(session).toBe(null);
  });

  it('can add a session', async () => {
    await store.dispatch(addSession(jsonSession));
    const session = getSession(store.getState());
    expect(session.meta.id).toBe('bc09f773-001a-4c36-a7d9-bb6dfbfafc02');
    expect(session.valid).toBe(true);
  });

  it('can remove a session', async () => {
    await store.dispatch(addSession(jsonSession));
    await store.dispatch(removeSession());
    const session = getSession(store.getState());
    expect(session).toBe(null);
  });

  it('can invalidate a session', async () => {
    await store.dispatch(addSession(jsonSession));
    await store.dispatch(invalidSession());
    const session = getSession(store.getState());
    expect(session.valid).toBe(false);
  });

  it('can mark a session with limit reached', async () => {
    await store.dispatch(addSession(jsonSession));
    await store.dispatch(limitReached());
    const session = getSession(store.getState());
    expect(session.valid).toBe(true);
    expect(session.limitReached).toBe(true);
  });

  it('can handle invalid event', async () => {
    await store.dispatch(addSession(jsonSession));
    await store.dispatch({ type: 'wrong' });
    const session = getSession(store.getState());
    expect(session.meta.id).toBe('bc09f773-001a-4c36-a7d9-bb6dfbfafc02');
    expect(session.valid).toBe(true);
  });

  it('can handle events after it has removed', async () => {
    await store.dispatch(addSession(jsonSession));
    await store.dispatch(removeSession());
    await store.dispatch(invalidSession());
    await store.dispatch(limitReached());
    const session = getSession(store.getState());
    expect(session).toBe(null);
  });

  it('can handle an invalid session', async () => {
    await store.dispatch(addSession(jsonSession));
    let session = getSession(store.getState());
    expect(session.meta.id).toBe('bc09f773-001a-4c36-a7d9-bb6dfbfafc02');
    expect(session.valid).toBe(true);

    await store.dispatch(
      addSession({
        meta: {
          type: 'network',
          id: '71263713-caad-42fe-bc98-310ed4e2ef67',
        },
      }),
    );

    session = getSession(store.getState());
    expect(session.meta.id).toBe('bc09f773-001a-4c36-a7d9-bb6dfbfafc02');
    expect(session.valid).toBe(true);
  });
});
