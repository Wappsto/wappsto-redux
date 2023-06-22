import { normalize } from 'normalizr';
import equal from 'deep-equal';

import { ADD_ENTITIES, REMOVE_ENTITIES } from '../actions/entities';
import schemas from '../util/schemas';
import parse from '../util/parser';

const initialState = {};

function mergeUnique(arr1, arr2) {
  const arr = arr1 ? [...arr1] : [];
  arr2.forEach((e) => {
    if (!arr1 || !arr1.includes(e)) {
      arr.push(e);
    }
  });
  return arr;
}

function addEntity(state, type, data) {
  if (!type) {
    return { state, result: data.result };
  }
  const newState = { ...state };
  const newData = normalize(data, schemas.getSchema(type));
  Object.keys(newData.entities).forEach((key) => {
    newState[key] = { ...newState[key], ...newData.entities[key] };
  });
  return { state: newState, result: newData.result };
}

function addEntities(state, type, data) {
  if (!type) {
    return { state, result: data.result };
  }
  const newState = { ...state };
  const newData = normalize(data, [schemas.getSchema(type)]);
  Object.keys(newData.entities).forEach((key) => {
    newState[key] = { ...newState[key], ...newData.entities[key] };
  });
  return { state: newState, result: newData.result };
}

function removeEntities(state, type, ids = []) {
  if (!type) {
    return { state, result: [] };
  }
  let newIds = ids;
  if (typeof ids === 'string') {
    newIds = [ids];
  }
  let newState = { ...state };
  newIds.forEach((id) => {
    // eslint-disable-next-line no-use-before-define
    const newData = removeEntity(newState, type, id);
    newState = newData.state;
  });
  const def = schemas.getSchemaTree(type);
  newState[def.name] = { ...newState[def.name] };
  return { state: newState, result: [] };
}

function removeAllEntities(state, type) {
  if (!type) {
    return { state, result: [] };
  }
  let newState = { ...state };
  const def = schemas.getSchemaTree(type);
  const entities = newState[def.name];
  if (entities) {
    const newData = removeEntities(newState, type, Object.keys(entities));
    newState = newData.state;
  }
  return { state: newState, result: [] };
}

function addChildEntities(state, type, id, child, data, reset = true) {
  if (!type) {
    return { state, result: data.result };
  }
  let newData;
  let result;
  let newState = { ...state };
  const def = schemas.getSchemaTree(type);
  const element = newState[def.name] && newState[def.name][id];
  let childDef = def.dependencies.find((d) => d.key === child);
  if (!childDef) {
    childDef = {
      key: child,
      type: data.constructor === Array && 'many',
    };
  }
  if (childDef.type === 'many') {
    newData = addEntities(newState, child, data);
    result = newData.result;
    if (
      element &&
      !equal(
        element[child],
        data.map((i) => i.meta.id),
      )
    ) {
      const newElement = { ...element };
      newElement[child] = reset ? result : mergeUnique(element[child], result);
      newState[def.name][id] = newElement;
    }
  } else {
    newData = addEntity(newState, child, data);
    result = newData.result;
    if (element && !equal(element[child], data.meta.id)) {
      const newElement = { ...element };
      newElement[child] = result;
      newState[def.name][id] = newElement;
    }
  }
  newState = newData.state;
  return { state: newState, result };
}

function removeEntity(state, type, id) {
  if (!type) {
    return { state };
  }
  let newState = { ...state };
  const def = schemas.getSchemaTree(type);
  const element = newState[def.name] && newState[def.name][id];
  if (element) {
    def.dependencies.forEach((dep) => {
      // eslint-disable-next-line no-use-before-define
      const newData = removeChildEntities(newState, type, id, dep.key);
      newState = newData.state;
    });
    delete newState[def.name][id];
  }
  return { state: newState };
}

function removeChildEntities(state, type, id, child, ids) {
  if (!type) {
    return { state, result: undefined };
  }
  let result;
  const def = schemas.getSchemaTree(type);
  const element = state[def.name] && state[def.name][id];
  const childDef = def.dependencies.find((d) => d.key === child);
  const newData = removeEntities(state, child, ids || (element && element[child]) || []);
  const newState = newData.state;
  if (
    (childDef && childDef.type === 'many') ||
    (element && element[child] && element[child].constructor === Array)
  ) {
    if (ids && element) {
      result = element[child].filter((c) => !ids.includes(c));
    } else {
      result = [];
    }
  } else {
    result = undefined;
  }
  if (element) {
    const newElement = { ...element };
    newElement[child] = result;
    newState[def.name][id] = newElement;
  }
  return { state: newState, result };
}

function reducer(state = initialState, action = {}) {
  let newData;
  let data;
  let newState = { ...state };
  let newAction;

  switch (action.type) {
    case ADD_ENTITIES:
      data = parse(action.data);
      if (data.constructor === Object) {
        data = [data];
      }
      if (action.options.parent) {
        if (action.options.reset !== false) {
          newData = removeChildEntities(
            newState,
            action.options.parent.type,
            action.options.parent.id,
            action.service,
          );
          newState = newData.state;
        }
        newData = addChildEntities(
          newState,
          action.options.parent.type,
          action.options.parent.id,
          action.service,
          data,
          action.options.reset,
        );
        newState = newData.state;
      } else {
        if (action.options.reset !== false) {
          newData = removeAllEntities(newState, action.service);
          newState = newData.state;
        }
        newData = addEntities(newState, action.service, data);
        newState = newData.state;
      }
      return newState;
    case REMOVE_ENTITIES:
      newAction = { ...action };
      if (newAction.options.parent) {
        newData = removeChildEntities(
          newState,
          newAction.options.parent.type,
          newAction.options.parent.id,
          newAction.service,
          newAction.ids,
        );
        newState = newData.state;
      } else {
        if (!newAction.ids) {
          const def = schemas.getSchemaTree(newAction.service);
          newAction.ids = Object.keys(newState[def.name] || {});
        }
        newData = removeEntities(newState, newAction.service, newAction.ids);
        newState = newData.state;
      }
      return newState;
    default:
      return state;
  }
}

export default reducer;
