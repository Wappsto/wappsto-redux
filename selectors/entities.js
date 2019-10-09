import { createSelector } from "reselect";
import schemaTree from "../util/schemaTree";

function getTreeName(key){
  return (schemaTree[key] && schemaTree[key].name) || key;
}

function matchObject(obj1, obj2) {
  for (const key in obj2) {
    if(obj1.hasOwnProperty(key)){
      let left = obj1[key];
      let right = obj2[key];
      if (left && right && left.constructor !== right.constructor) {
        return false;
      } else if (typeof(left) === "object") {
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
const stateSelector = state => state.entities;

const makeStateTypeSelector = () => createSelector(
  stateSelector,
  (_, type) => type,
  (entities, type) => entities[getTreeName(type)]
);

const makeParentStateTypeSelector = () => createSelector(
  stateSelector,
  (_, _1, options) => options && options.parent && options.parent.type,
  (entities, type) => entities[getTreeName(type)]
);

const makeParentSelector = () => {
  const parentStateTypeSelector = makeParentStateTypeSelector();
  return createSelector(
    parentStateTypeSelector,
    (_, _1, options) => options && options.parent && options.parent.id,
    (entities, id) => {
      if(id){
        return entities[id];
      }
      return null;
    }
  );
}

export const makeEntitySelector = () => {
  const stateTypeSelector = makeStateTypeSelector();
  const parentSelector = makeParentSelector();
  return createSelector(
    stateTypeSelector,
    parentSelector,
    (_, type) => type,
    (_, _1, options) => options,
    (entities, parent, type, options={}) => {
      if(entities && options){
        if(options.constructor === String){
          // options is an id
          return entities[options];
        } else if(options.constructor === Object){
          if(parent){
            if(parent.hasOwnProperty(type)){
              if(parent[type].constructor === Array){
                for(let i = 0; i < parent[type].length; i++){
                  let id = parent[type][i];
                  let found = entities[id];
                  if(found && matchObject(found, options.filter || {})){
                    return found;
                  }
                }
              } else {
                if(options.filter && matchObject(parent[type], options.filter || {})){
                  return parent[type];
                } else {
                  return undefined;
                }
              }
            }
          } else {
            for(let key in entities){
              let val = entities[key];
              if(matchObject(val, options.filter || {})){
                return val;
              }
            }
          }
        }
      }
      return undefined;
    }
  );
}

export const makeEntitiesSelector = () => {
  const stateTypeSelector = makeStateTypeSelector();
  const parentSelector = makeParentSelector();
  return createSelector(
    stateTypeSelector,
    parentSelector,
    (_, type) => type,
    (_, _1, options) => options,
    (entities, parent, type, options={}) => {
      let result;
      if(entities){
        if(parent){
          result = [];
          if(parent.hasOwnProperty(type)){
            parent[type].forEach((id) => {
              let found = entities[id];
              if(found){
                if(options.filter){
                  let filters = options.filter;
                  if(!(filters instanceof Array)){
                    filters = [filters];
                  }
                  for(let i = 0; i < filters.length; i++){
                    if(matchObject(found, filters[i])){
                      result.push(found);
                      break;
                    }
                  }
                } else {
                  result.push(found);
                }
              }
            });
          }
        } else {
          if(options.filter){
            let filters = options.filter;
            result = [];
            if(!(filters instanceof Array)){
              filters = [filters];
            }
            filters.forEach(filter => {
              for(let key in entities){
                const val = entities[key];
                if(matchObject(val, filter)){
                  result.push(val);
                  break;
                }
              }
            });
          } else {
            result = Object.values(entities);
          }
        }
      } else {
        result = defaultArr;
      }
      return result.slice(0, options.limit);
    }
  );
}

export const getUserData = () => {
  const stateTypeSelector = makeStateTypeSelector();
  return createSelector(
    (state) => stateTypeSelector(state, 'user'),
    (entities) => {
      if(entities){
        return Object.values(entities)[0];
      }
      return undefined;
    }
  );
}
