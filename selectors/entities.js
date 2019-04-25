import schemaTree from "../util/schemaTree.json";

function getTreeName(key){
  return (schemaTree[key] && schemaTree[key].name) || key;
}

export const getEntity = (state, type, id) => {
  let name = getTreeName(type);
  return (state.entities[name] &&  state.entities[name][id]) || {};
}

export const getEntities = (state, type, options = {}) => {
  let result;
  let name = getTreeName(type);
  if(options.parent){
    result = [];
    let parent = getEntity(state, options.parent.type, options.parent.id);
    if(parent && state.entities[name] && parent[type]){
      parent[type].forEach((id) => {
        let found = state.entities[name][id];
        if(found){
          result.push(found);
        }
      });
    }
  } else {
    result = Object.values(state.entities[name] || {});
  }
  return result;
}

export const getUserData = (state) => {
  return state.entities.users && state.entities.users[Object.keys(state.entities[schemaTree.user.name])[0]];
}
