import config from "./config";
import { getUrlInfo } from "./util/helpers";
import { addEntities, removeEntities } from "./actions/entities";
import schemaTree from "./util/schemaTree.json";

let store;

export function useStore(configuredStore){
  store = configuredStore;
}

export async function initializeStream(streamJSON = {}, session) {
  let headers = { "x-session": session };
  let url = config.baseUrl + "/stream?expand=0";
  if(streamJSON.name){
    url += "&this_name="+streamJSON.name
  }
  try{
    let response = await fetch(url, { headers });
    if(!response.ok){
      throw response;
    }
    let json = await response.json();
    if (json.length > 0) {
      if (!streamJSON.hasOwnProperty('full')) {
          streamJSON.full = true;
      }
      let stream = json[0];

      // merging with json
      let newJSON = _mergeStreams(stream, streamJSON);

      if(newJSON){
        let updateResponse = await fetch(config.baseUrl + "/stream/" + stream.meta.id, { method: "PATCH", body: JSON.stringify(newJSON), headers});
        if(!updateResponse.ok){
          throw updateResponse;
        }
      }
      _startStream(newJSON || stream, session);
    } else {
      let stream = await _createStream(streamJSON, session);
      _startStream(stream, session);
    }
  } catch(e){
    console.log("failed to initializeStream");
    console.log(e);
  }
}

function _mergeStreams(oldJSON, newJSON){
  let update = false;
  if(newJSON.subscription){
    newJSON.subscription.forEach((sub) => {
      if(oldJSON.subscription.indexOf(sub) === -1){
        update = true;
        oldJSON.subscription.push(sub);
      }
    });
  }
  if(newJSON.ignore){
    newJSON.ignore.forEach((sub) => {
      if(oldJSON.ignore.indexOf(sub) === -1){
        update = true;
        oldJSON.ignore.push(sub);
      }
    });
  }
  if(oldJSON.full !== newJSON.full){
    update = true;
    oldJSON = newJSON.full;
  }
  return update ? oldJSON : undefined;
}

async function _createStream(streamJSON, session) {
  let response = await fetch(config.baseUrl + "/stream", { method: "POST", body: JSON.stringify(streamJSON), headers : { "x-session": session }});
  if(!response.ok){
    throw response;
  }
  let json = response.json();
  return json;
}

function addChildren(message, state){
  let type = message.meta_object.type;
  let data = message[type];
  if(schemaTree[type] && schemaTree[type].dependencies){
    let cachedData = state.entities[schemaTree[type].name][data.meta.id];
    schemaTree[type].dependencies.forEach(({key, type}) => {
      data[key] = cachedData ? cachedData[key] : ( type === "many" ? [] : undefined );
    });
  }
}

function _startStream(stream, session){
  let url = config.baseUrl + "/stream/" + stream.meta.id + "?x-session=" + session;
  let ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("Stream open: " + url);
  };

  ws.onmessage = (e) => {
    // a message was received
    try{
      let data = JSON.parse(e.data);
      data.forEach(message => {
        let state = store.getState();
        switch(message.event){
          case "create":
            // since stream does not have child list, I'm going to add it from cached store state
            addChildren(message, state);
            if(message.meta_object.type === "state"){
              if(schemaTree.state && schemaTree.state.name && state.entities[schemaTree.state.name].hasOwnProperty(message.meta_object.id)){
                store.dispatch(addEntities(message.meta_object.type, message[message.meta_object.type], { reset: false }));
              } else {
                let { parent } = getUrlInfo(message.path, 1);
                store.dispatch(addEntities(message.meta_object.type, [message[message.meta_object.type]], { reset: false, parent }));
              }
            } else {
              let { parent } = getUrlInfo(message.path, 1);
              store.dispatch(addEntities(message.meta_object.type, message[message.meta_object.type], { reset: false, parent }));
            }
            break;
          case "update":
            // since stream does not have child list, I'm going to add it from cached store state
            addChildren(message, state);
            store.dispatch(addEntities(message.meta_object.type, message[message.meta_object.type], { reset: false }));
            break;
          case "delete":
            let { parent } = getUrlInfo(message.path, 1);
            store.dispatch(removeEntities(message.meta_object.type, [message.meta_object.id]), { parent });
            break;
        }
      })
    } catch(e){

    }
  };

  ws.onerror = (e) => {
    console.log("Stream error: " + url);
  };

  ws.onclose = (e) => {
    console.log("Stream close: " + url);
  };
}
