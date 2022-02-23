export const ADD_SESSION = 'ADD_SESSION';
export const REMOVE_SESSION = 'REMOVE_SESSION';
export const INVALID_SESSION = 'INVALID_SESSION';
export const LIMIT_REACHED = 'LIMIT_REACHED';

export function addSession(data) {
  return {
    type: ADD_SESSION,
    data
  };
}

export function removeSession() {
  return {
    type: REMOVE_SESSION
  };
}

export function invalidSession() {
  return {
    type: INVALID_SESSION
  };
}

export function limitReached() {
  return {
    type: LIMIT_REACHED
  };
}
