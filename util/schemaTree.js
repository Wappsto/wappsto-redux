let schemaTree = {
  "user": {
    "dependencies": []
  },
  "state": {
    "dependencies": []
  },
  "value": {
    "dependencies": [{
      "key": "state",
      "type": "many"
    }]
  },
  "device": {
    "dependencies": [{
      "key": "value",
      "type": "many"
    }]
  },
  "network": {
    "dependencies": [{
      "key": "device",
      "type": "many"
    }]
  },
  "permission": {
    "dependencies": []
  },
  "acl": {
    "dependencies": [{
      "key": "permission",
      "type": "many"
    }]
  }
}

export default schemaTree;
