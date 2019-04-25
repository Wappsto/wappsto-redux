export function isUUID(data){
  try {
    if (data.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-b8-9][a-f0-9]{3}-[a-f0-9]{12}$/i).length > 0) {
      return true;
    }
  } catch (err) {}
  return false;
}

export function getUrlInfo(url, skip = 0){
  let service, parent, id;
  let split = url.split("/");
  if(isUUID(split[split.length - 1 - skip])){
    id = split[split.length - 1 - skip];
    service = split[split.length - 2 - skip];
  } else {
    service = split[split.length - 1 - skip];
    if(split.length > (3 + skip)){
      parent = {
        type: split[split.length - 3 - skip],
        id: split[split.length - 2 - skip]
      };
    }
  }
  return { service, id, parent };
}
