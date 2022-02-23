import reducerRegistry from '../util/reducerRegistry';
import entitiesReducer from './entities';
import itemsReducer from './items';
import requestReducer from './request';
import sessionReducer from './session';
import streamReducer from './stream';

reducerRegistry.register('entities', entitiesReducer);
reducerRegistry.register('items', itemsReducer);
reducerRegistry.register('request', requestReducer);
reducerRegistry.register('stream', streamReducer);
reducerRegistry.register('session', sessionReducer);
