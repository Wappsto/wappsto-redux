/**
 * @jest-environment jsdom
 */
import WS from 'jest-websocket-mock';
import {
  configureStore,
  makeStreamSelector,
  makeEntitySelector,
  openStream,
  closeStream
} from '../src';

describe('stream', () => {
  const getEntity = makeEntitySelector();
  let getStream = makeStreamSelector();
  let server;
  let store;

  beforeEach(() => {
    store = configureStore();
    server = new WS('ws://localhost/services/stream/open', { jsonProtocol: true });
  });

  afterEach(() => {
    WS.clean();
  });

  it('fails to open stream without name', async () => {
    let ws = store.dispatch(openStream({}, null, {}));
    expect(ws).toBe(undefined);
  });

  it('can open and close a stream', async () => {
    let ws = store.dispatch(openStream({ name: 'main', subscription: [], full: true }, null, {}));

    await server.connected;

    let ws2 = getStream(store.getState(), 'main');
    await store.dispatch(closeStream('main'));
    let ws3 = getStream(store.getState(), 'main');

    await new Promise((r) => setTimeout(r, 1));

    expect(ws).not.toBe(undefined);
    expect(ws2).not.toBe(undefined);
    expect(ws3).toBe(undefined);
  });

  it('can open and handle a close event', async () => {
    store.dispatch(openStream({ name: 'main', subscription: [], full: true }, null, {}));

    await server.connected;

    server.error();
    //server.close();

    await server.connected;

    let ws = getStream(store.getState(), 'main');

    expect(ws).not.toBe(undefined);
    expect(ws.status).toEqual(2);
  });

  it('can handle stream messages', async () => {
    store.dispatch(openStream({ name: 'main', subscription: [], full: true }, null, {}));

    await server.connected;

    server.send({});

    server.send({
      event: 'create',
      meta_object: {
        type: 'network'
      },
      network: {
        meta: {
          type: 'network',
          id: 'network_id'
        },
        name: 'network name'
      }
    });

    server.send({
      event: 'create',
      meta_object: {
        type: 'device'
      },
      path: '/network/network_id/device',
      device: {
        meta: {
          type: 'device',
          id: 'device_id'
        },
        name: 'device name'
      }
    });

    server.send({
      event: 'create',
      meta_object: {
        type: 'value'
      },
      path: '/network/network_id/device/device_id/value',
      value: {
        meta: {
          type: 'value',
          id: 'value_id'
        },
        name: 'value name'
      }
    });

    server.send({
      event: 'create',
      meta_object: {
        type: 'state'
      },
      path: '/network/network_id/device/device_id/value/value_id/state',
      data: {
        meta: {
          type: 'state',
          id: 'state_id'
        },
        type: 'Report',
        data: '1'
      }
    });

    await new Promise((r) => setTimeout(r, 1));
    let n = getEntity(store.getState(), 'network', 'network_id');
    let d = getEntity(store.getState(), 'device', 'device_id');
    let v = getEntity(store.getState(), 'value', 'value_id');
    let s = getEntity(store.getState(), 'state', 'state_id');

    expect(n.name).toEqual('network name');
    expect(d.name).toEqual('device name');
    expect(v.name).toEqual('value name');
    expect(s.type).toEqual('Report');
    expect(s.data).toEqual('1');

    server.send({
      event: 'update',
      meta_object: {
        type: 'state'
      },
      path: '/network/network_id/device/device_id/value/value_id/state/state_id',
      data: {
        meta: {
          type: 'state',
          id: 'state_id'
        },
        type: 'Report',
        data: '2'
      }
    });

    await new Promise((r) => setTimeout(r, 1));
    s = getEntity(store.getState(), 'state', 'state_id');
    expect(s.data).toEqual('2');

    server.send({
      event: 'delete',
      meta_object: {
        id: 'state_id',
        type: 'state'
      },
      path: '/network/network_id/device/device_id/value/value_id/state/state_id',
      data: {
        meta: {
          type: 'state',
          id: 'state_id'
        },
        type: 'Report',
        data: '2'
      }
    });

    await new Promise((r) => setTimeout(r, 1));
    s = getEntity(store.getState(), 'state', 'state_id');
    expect(s).toBe(undefined);
  });
});
