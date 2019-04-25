export function parse(json){
  if(json.constructor === Object && json.meta.type === "idlist"){
    return [];
  }
  return json;
}
