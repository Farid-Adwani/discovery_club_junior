/** The sign-in token from /api/auth/login, kept in this browser so the user stays signed in. */
const KEY = 'dcj-session';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memoryToken;
  }
}

export function setSessionToken(token: string) {
  memoryToken = token;
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // storage blocked (private mode): signed in for this tab only
  }
}

export function clearSessionToken() {
  memoryToken = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
}

let memoryToken: string | null = null;
