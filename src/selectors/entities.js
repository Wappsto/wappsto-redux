import { createSelector } from 'reselect';
import schemaTree from '../util/schemaTree';

function getTreeName(key) {
  return (schemaTree[key] && schemaTree[key].name) || key;
}

function matchObject(obj1, obj2) {
  for (let i = 0; i < Object.keys(obj2).length; i += 1) {
    const key = Object.keys(obj2)[i];
    if (Object.prototype.hasOwnProperty.call(obj1, key)) {
      const left = obj1[key];
      const right = obj2[key];
      if (left && right && left.constructor !== right.constructor) {
        return false;
      }
      if (typeof left === 'object') {
        if (!matchObject(left, right)) {
          return false;
        }
      } else if (left !== right) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

const defaultArr = [];
const stateSelector = (state) => state.entities;

const makeStateTypeSelector = () =>
  createSelector(
    stateSelector,
    (_, type) => type,
    (entities, type) => entities && entities[getTreeName(type)],
  );

const makeParentStateTypeSelector = () =>
  createSelector(
    stateSelector,
    (_, _1, options) => options && options.parent && options.parent.type,
    (entities, type) => entities && entities[getTreeName(type)],
  );

const makeParentSelector = () => {
  const parentStateTypeSelector = makeParentStateTypeSelector();
  return createSelector(
    parentStateTypeSelector,
    (_, _1, options) => options && options.parent && options.parent.id,
    (entities, id) => {
      if (id && entities) {
        return entities[id];
      }
      return null;
    },
  );
};

export const makeEntitySelector = () => {
  const stateTypeSelector = makeStateTypeSelector();
  const parentSelector = makeParentSelector();
  return createSelector(
    stateTypeSelector,
    parentSelector,
    (_, type) => type,
    (_, _1, options) => options,
    (entities, parent, type, options) => {
      if (entities && options) {
        if (options.constructor === String) {
          // options is an id
          return entities[options];
        }
        if (options.constructor === Object) {
          if (options.parent) {
            if (parent && Object.prototype.hasOwnProperty.call(parent, type)) {
              if (parent[type].constructor === Array) {
                for (let i = 0; i < parent[type].length; i += 1) {
                  const id = parent[type][i];
                  const found = entities[id];
                  if (found && matchObject(found, options.filter || {})) {
                    return found;
                  }
                }
              } else {
                if (options.filter && matchObject(parent[type], options.filter || {})) {
                  return parent[type];
                }
                return undefined;
              }
            }
          } else {
            for (let i = 0; i < Object.keys(entities).length; i += 1) {
              const key = Object.keys(entities)[i];
              const val = entities[key];
              if (matchObject(val, options.filter || {})) {
                return val;
              }
            }
          }
        }
      }
      return undefined;
    },
  );
};

function shallowEqualArrays(arrA, arrB) {
  if (arrA === arrB) {
    return true;
  }

  if (!arrA || !arrB) {
    return false;
  }

  const len = arrA.length;

  if (arrB.length !== len) {
    return false;
  }

  for (let i = 0; i < len; i += 1) {
    if (arrA[i] !== arrB[i]) {
      return false;
    }
  }

  return true;
}

export const makeEntitiesSelector = () => {
  const stateTypeSelector = makeStateTypeSelector();
  const parentSelector = makeParentSelector();
  let old = [];
  return createSelector(
    stateTypeSelector,
    parentSelector,
    (_, type) => type,
    (_, _1, options) => options,
    (entities, parent, type, options = {}) => {
      let result;
      if (entities) {
        let filters;
        let ids;
        let lookIn;
        if (options.constructor === String) {
          ids = [options];
        } else if (options.constructor === Array) {
          ids = options;
        } else {
          ids = options.ids;
          if (options.filter) {
            if (options.filter.constructor === Object) {
              filters = [options.filter];
            } else if (options.filter.constructor === Array) {
              if (options.filter.length && options.filter[0].constructor === String) {
                ids = [...(options.ids || []), ...options.filter];
              } else {
                filters = options.filter;
              }
            } else {
              ids = [...(options.ids || []), options.filter];
            }
          }
        }
        if (ids) {
          lookIn = {};
          ids.forEach((id) => {
            const found = entities[id];
            if (found) {
              lookIn[id] = found;
            }
          });
        } else {
          lookIn = entities;
        }
        if (options.parent) {
          result = [];
          if (parent && Object.prototype.hasOwnProperty.call(parent, type)) {
            if (filters) {
              filters.forEach((filter) => {
                parent[type].forEach((id) => {
                  const found = lookIn[id];
                  if (found && matchObject(found, filter) && !result.includes(found)) {
                    result.push(found);
                  }
                });
              });
            } else {
              parent[type].forEach((id) => {
                const found = lookIn[id];
                if (found) {
                  result.push(found);
                }
              });
            }
          }
        } else if (filters) {
          result = [];
          filters.forEach((filter) => {
            lookIn.forEach((key) => {
              const val = lookIn[key];
              if (matchObject(val, filter) && !result.includes(val)) {
                result.push(val);
              }
            });
          });
        } else {
          result = Object.values(lookIn);
        }
      } else {
        result = defaultArr;
      }
      result = result.slice(0, options.limit);
      if (shallowEqualArrays(result, old)) {
        return old;
      }
      old = result;
      return result;
    },
  );
};

const userStateSelector = makeStateTypeSelector();
export const getUserData = createSelector(
  (state) => userStateSelector(state, 'user'),
  (entities) => {
    if (entities) {
      return Object.values(entities)[0];
    }
    return undefined;
  },
);
