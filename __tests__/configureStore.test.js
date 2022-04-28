import { configureStore } from '../src';

describe('configureStore', () => {
  it('can create a new store', () => {
    const cs = configureStore();
    expect(cs.getState().items).toEqual({});
  });

  it('can create a new store with parameters', () => {
    const cs = configureStore({ items: { test: true } });
    expect(cs.getState().items.test).toBe(true);
  });

  it('can create a new store with enhancers', () => {
    let handled = 0;
    const testEnhancer =
      createStore => (reducer, initialState, enhancer) => {
        const testReducer = (state, action) => {
          const newState = reducer(state, action)
          handled += 1;
          return newState
        }

        return createStore(testReducer, initialState, enhancer)
      }

    const cs = configureStore({ items: { test: true } }, [testEnhancer]);

    expect(cs.getState().items.test).toBe(true);
    expect(handled).toBe(1);
  });
});
