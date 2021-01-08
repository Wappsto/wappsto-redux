const cache = {};
const defaultValues = {};

function initialize(key, value){
  cache[key] = value;
  defaultValues[key] = value;
}

function get(key){
  return cache[key];
}

function set(key, value){
  cache[key] = value;
}

function clean(){
  for(let key in cache){
    cache[key] = defaultValues[key];
  }
}

export { get, set, clean, initialize };
