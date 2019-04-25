import { schema } from "normalizr";
import schemaTree from "./schemaTree.json";

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

export default schemas;
