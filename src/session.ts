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

/**
 * "View as this parent": the admin's own token waits here while the parent's account is open,
 * and comes back with "Back to admin". Kept in localStorage so a reload doesn't lose it.
 */
const ADMIN_KEY = 'dcj-admin-session';

export function getAdminReturnToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_KEY);
  } catch {
    return null;
  }
}

export function setAdminReturnToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_KEY, token);
    else localStorage.removeItem(ADMIN_KEY);
  } catch {
    // storage blocked: "Back to admin" will ask to sign in again
  }
}
