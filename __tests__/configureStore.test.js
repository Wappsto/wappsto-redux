import { configureStore } from '../src'

describe('configureStore', () => {
  it('can create a new store', () => {
    let cs = configureStore()
    expect(cs.getState().items).toEqual({})
  })

  it('can create a new store with parameters', () => {
    let cs = configureStore({ items: { ['test']: true } })
    expect(cs.getState().items['test']).toBe(true)
  })
})
