function parse(json) {
  if (!json) {
    return [];
  }
  if (json.constructor === Object && json.meta) {
    if (json.meta.type === 'idlist') {
      return [];
    }
    if (json.meta.type === 'attributelist') {
      const result = json;
      result.meta.id = json.path;
      return [result];
    }
  }
  return json;
}

export default parse;
