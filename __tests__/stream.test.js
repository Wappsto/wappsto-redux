/**
 * @jest-environment jsdom
 */
import WS from 'jest-websocket-mock';

import {
  configureStore,
  makeStreamSelector,
  openStream,
  closeStream,
  removeStream,
  initializeStream,
} from '../src'

describe('stream', () => {
  let server = new WS('ws://localhost', { jsonProtocol: true });
  let store

  beforeEach(() => {
    store = configureStore()
  })

  it('can open and close a stream', async () => {
    let ws = store.dispatch(
        openStream(
          { name: 'main', subscription: [], full: true },
          null,
          {}
        )
      );
    console.log(ws);
  })
});