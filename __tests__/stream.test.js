/**
 * @jest-environment jsdom
 */
import WS from 'jest-websocket-mock';
import fetchMock from 'jest-fetch-mock'
import {
  configureStore,
  makeStreamSelector,
  openStream,
  closeStream,
  initializeStream,
} from '../src'

describe('stream', () => {
  let getStream = makeStreamSelector();
  let server = new WS('ws://localhost/services/stream/open', { jsonProtocol: true });
  let store

  beforeEach(() => {
    store = configureStore()
  })

  it('fails to open stream without name', async () => {
    let ws = store.dispatch(
        openStream(
          { },
          null,
          {}
        )
      );
    expect(ws).toBe(undefined)
  });

  it('can open and close a stream', async () => {
    let ws = store.dispatch(
        openStream(
          { name: 'main', subscription: [], full: true },
          null,
          {}
        )
      );

    await server.connected;

    let ws2 = getStream(store.getState(), 'main');
    await store.dispatch(closeStream('main'))
    let ws3 = getStream(store.getState(), 'main');

    expect(ws).not.toBe(undefined)
    expect(ws2).not.toBe(undefined)
    expect(ws3).toBe(undefined)
  })
});