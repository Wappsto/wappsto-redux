import { onLogout, trigger } from '../src'

describe('events', () => {
  it('trigger an logout event', () => {
    let fun = jest.fn()
    onLogout(fun)
    trigger('logout', 'test')

    expect(fun).toHaveBeenCalledTimes(1)
    expect(fun).toHaveBeenCalledWith('test')
  })

  it('will not trigger an logout event with an invalid event', () => {
    let fun = jest.fn()
    onLogout(fun)
    trigger('login', 'test')

    expect(fun).toHaveBeenCalledTimes(0)
  })
})
