const events = {
  logout: []
};

function onLogout(cb) {
  events.logout.push(cb);
}

function trigger(e, data) {
  if (events[e]) {
    events[e].forEach((cb) => cb(data));
  }
}

export { onLogout, trigger };
