import {
  configureStore,
  makeEntitySelector,
  makeEntitiesSelector,
  getUserData,
  addEntities,
  removeEntities
} from '../src';

describe('entities', () => {
  let store;
  const getEntity = makeEntitySelector();
  const getEntities = makeEntitiesSelector();

  beforeEach(() => {
    store = configureStore();
  });

  it('can get an empty entity', () => {
    let item = getEntity(store.getState(), 'key');
    expect(item).toBe(undefined);
  });

  it('can add and remove entities', async () => {
    let add = await store.dispatch(
      addEntities('network', { meta: { type: 'network', id: 'network_id' }, name: 'network' })
    );
    let item = getEntity(store.getState(), 'network', 'network_id');

    let rem = store.dispatch(removeEntities('network', 'network_id'));
    let item2 = getEntity(store.getState(), 'network', 'network_id');

    expect(add.type).toEqual('ADD_ENTITIES');
    expect(add.service).toEqual('network');
    expect(add.options).toEqual({});
    expect(item.name).toEqual('network');

    expect(rem.type).toEqual('REMOVE_ENTITIES');
    expect(rem.service).toEqual('network');
    expect(rem.ids).toEqual('network_id');

    expect(item2).toBe(undefined);
  });

  it('can get user data', async () => {
    let noUser = getUserData(store.getState());
    await store.dispatch(
      addEntities('user', { meta: { type: 'user', id: 'user_id' }, name: 'User' })
    );
    let user = getUserData(store.getState());

    expect(noUser).toBe(undefined);
    expect(user.name).toEqual('User');
  });

  it('can get multiple enties', async () => {
    let noItems = getEntities(store.getState());
    await store.dispatch(
      addEntities('network', {
        meta: { type: 'network', id: 'network_id' },
        name: 'network',
        device: [
          {
            meta: {
              type: 'device',
              id: 'device_id_1'
            },
            name: 'Device Name 1'
          },
          {
            meta: {
              type: 'device',
              id: 'device_id_2'
            },
            name: 'Device Name 2'
          }
        ]
      })
    );

    let items = getEntities(store.getState(), 'device', [
      'device_id_1',
      'device_id_2',
      'device_id_3'
    ]);

    expect(noItems).toEqual([]);
    expect(items.length).toBe(2);
    expect(items[0].name).toEqual('Device Name 1');
    expect(items[1].name).toEqual('Device Name 2');
  });

  it('can add multiple items and merge them', async () => {
    await store.dispatch(
      addEntities('network', {
        meta: { type: 'network', id: 'network_id' },
        name: 'network',
        device: [
          {
            meta: {
              type: 'device',
              id: 'device_id_1'
            },
            name: 'Device Name 1'
          },
          {
            meta: {
              type: 'device',
              id: 'device_id_2'
            },
            name: 'Device Name 2'
          }
        ]
      })
    );
    await store.dispatch(
      addEntities('network', {
        meta: { type: 'network', id: 'network_id' },
        name: 'network',
        device: [
          {
            meta: {
              type: 'device',
              id: 'device_id_2'
            },
            name: 'New Device Name 2'
          },
          {
            meta: {
              type: 'device',
              id: 'device_id_3'
            },
            name: 'Device Name 3'
          }
        ]
      })
    );
    let device = getEntities(store.getState(), 'device', {
      filter: { name: 'New Device Name 2' }
    });
    expect(device.length).toBe(1);
    expect(device[0].name).toEqual('New Device Name 2');

    device = getEntities(store.getState(), 'device', 'device_id_2');
    expect(device.length).toBe(1);
    expect(device[0].name).toEqual('New Device Name 2');

    device = getEntities(store.getState(), 'device', { filter: ['device_id_2'] });
    expect(device.length).toBe(1);
    expect(device[0].name).toEqual('New Device Name 2');
    /*
    device = getEntities(store.getState(), 'device', {parent: {device:['device_id_2'], filter: ['device_id_2']}});
    expect(device.length).toBe(1);
    expect(device[0].name).toEqual('New Device Name 2');
*/
    let devices = getEntities(store.getState(), 'device', {
      filter: [{ name: 'New Device Name 2' }, { name: 'Device Name 3' }]
    });

    expect(devices.length).toBe(2);
    expect(devices[0].name).toEqual('New Device Name 2');
    expect(devices[1].name).toEqual('Device Name 3');
  });
});
