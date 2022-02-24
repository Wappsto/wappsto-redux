import {
  configureStore,
  makeEntitySelector,
  makeEntitiesSelector,
  getUserData,
  addEntities,
  removeEntities,
} from '../src'

describe('entities', () => {
  let store
  const getEntity = makeEntitySelector();
  const getEntities = makeEntitiesSelector();

  beforeEach(() => {
    store = configureStore()
  })

  it('can get an empty entity', () => {
    let item = getEntity(store.getState(), 'key')
    expect(item).toBe(undefined)
  });

  it('can add and remove entities', async () => {
    let add = await store.dispatch(addEntities('network', {meta: {type: 'network', id: 'network_id'}, name: 'network'}))
    let item = getEntity(store.getState(), 'network', 'network_id')

    expect(add.type).toEqual("ADD_ENTITIES")
    expect(add.service).toEqual("network")
    expect(add.options).toEqual({})
    expect(item.name).toEqual('network')
  })
});