import { configureStore } from '../src';

describe('configureStore', () => {
  it('can create a new store', () => {
    const cs = configureStore();
    expect(cs.getState().items).toEqual({});
  });

  it('can create a new store with parameters', () => {
    const cs = configureStore({ items: { 'test': true } });
    expect(cs.getState().items.test).toBe(true);
  });
});
