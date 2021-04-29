import { schema } from "normalizr";
import schemaTree from "./schemaTree";

const options = {
  idAttribute: (value, parent, key) => {
    return value.meta.id;
  }
};

let schemas = {};

for(let entity in schemaTree){
  let definition = {};
  schemaTree[entity].dependencies.forEach(dep => {
    definition[dep.key] = dep.type === "many" ? [schemas[dep.key]] : schemas[dep.key];
  });
  schemas[entity] = new schema.Entity(schemaTree[entity].name, definition, options);
}

schemas.generateGenericSchema = (name) => {
  schemaTree[name] = {
    name: name,
    dependencies: []
  }
  schemas[name] = new schema.Entity(name, {}, options);
}

schemas.getSchema = (type) => {
  if(!schemas.hasOwnProperty(type)){
    schemas.generateGenericSchema(type);
  }
  return schemas[type];
}

schemas.getSchemaTree = (type) => {
  if(!schemas.hasOwnProperty(type)){
    schemas.generateGenericSchema(type);
  }
  return schemaTree[type];
}

export default schemas;
