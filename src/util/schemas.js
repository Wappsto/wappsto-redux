import { schema } from 'normalizr';
import schemaTree from './schemaTree';

const options = {
  idAttribute: (value) => value.meta.id,
};

const schemas = {};

Object.keys(schemaTree).forEach((key) => {
  const definition = {};
  if (!schemaTree[key].name) {
    schemaTree[key].name = key;
  }
  schemaTree[key].dependencies.forEach((dep) => {
    definition[dep.key] = dep.type === 'many' ? [schemas[dep.key]] : schemas[dep.key];
  });
  schemas[key] = new schema.Entity(schemaTree[key].name, definition, options);
});

schemas.generateGenericSchema = (name) => {
  schemaTree[name] = {
    name,
    dependencies: [],
  };
  schemas[name] = new schema.Entity(name, {}, options);
};

schemas.getSchema = (type) => {
  if (!Object.prototype.hasOwnProperty.call(schemas, type)) {
    schemas.generateGenericSchema(type);
  }
  return schemas[type];
};

schemas.getSchemaTree = (type) => {
  if (!Object.prototype.hasOwnProperty.call(schemas, type)) {
    schemas.generateGenericSchema(type);
  }
  return schemaTree[type];
};

export default schemas;
