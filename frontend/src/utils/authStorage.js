const ACCESS_TOKEN_KEY = "larisdy_access_token";
const USER_KEY = "larisdy_user";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getStoredToken() {
  return canUseStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
}

export function setStoredToken(token) {
  if (!canUseStorage()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser() {
  if (!canUseStorage()) {
    return null;
  }

  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user) {
  if (!canUseStorage()) {
    return;
  }

  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(USER_KEY);
}

export function clearStoredAuth() {
  setStoredToken(null);
  setStoredUser(null);
}
