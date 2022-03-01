import { configureStore, setItem, removeItem, getItem, makeItemSelector } from '../src';

describe('items', () => {
  let store;
  const getItemSelector = makeItemSelector();

  beforeEach(() => {
    store = configureStore();
  });

  it('can get an empty item', () => {
    const item = getItem(store.getState(), 'key');
    expect(item).toBe(undefined);
  });

  it('can set and get an item', async () => {
    const item = await store.dispatch(setItem('key', 'data'));
    expect(item.data).toBe('data');
    expect(item.name).toBe('key');

    const item2 = getItem(store.getState(), 'key');
    expect(item2).toBe('data');

    const item3 = await store.dispatch(removeItem('key'));
    expect(item3.name).toBe('key');

    const item4 = getItem(store.getState(), 'key');
    expect(item4).toBe(undefined);
  });

  it('can add data as a function', async () => {
    const fun = jest.fn();
    await store.dispatch(setItem('key', 'test'));
    await store.dispatch(
      setItem('key', (data) => {
        fun(data);
      })
    );

    expect(fun).toHaveBeenCalledTimes(1);
    expect(fun).toHaveBeenCalledWith('test');
  });

  it('can get an item with the selector', async () => {
    await store.dispatch(setItem('key', 'test'));
    let item = getItemSelector(store.getState(), 'key');

    expect(item).toEqual('test');
  });
});
