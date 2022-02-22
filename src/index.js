import config from './config'
export * from './events'
export * from './util'
export * from './selectors'
export * from './reducers'
export * from './actions'
export * from './configureStore'

export function use(newConfig) {
  Object.assign(config, newConfig)
}
