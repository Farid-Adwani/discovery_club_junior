// Asking the browser for permission to show notifications.
//
// Browsers only open their permission prompt shortly after a click (Firefox and Safari ignore the request
// otherwise; Chrome may only show an icon in the address bar). So the prompt is opened right after the
// "Sign in" / "Create account" click succeeds; when the browser doesn't show it, the bell offers a small
// "Turn on notifications?" card instead, where one tap opens the prompt.

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** "Not now" on the card: asked again after this long */
const SNOOZE_KEY = 'dcj-push-not-now';
const SNOOZE_MS = 7 * 24 * 60 * 60_000;

let pending: Promise<NotificationPermission> | null = null;
/** Set when the person closed the prompt without choosing: the card waits like after "Not now" */
let dismissedNow = false;

/** Opens the browser's permission prompt (call it right after a click). Does nothing once the person has chosen. */
export function askPushPermission(): Promise<NotificationPermission> | null {
  if (!pushSupported() || Notification.permission !== 'default') return null;
  if (!pending) {
    const started = Date.now();
    pending = Notification.requestPermission()
      .catch(() => Notification.permission)
      .then((result) => {
        // Answered "default" very fast: the browser didn't show the prompt (no click). Slower: the person closed it.
        if (result === 'default' && Date.now() - started > 800) snoozePushCard();
        return result;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** The prompt opened at sign-in, while it is still on screen */
export const pendingPushPermission = () => pending;

export function snoozePushCard() {
  dismissedNow = true;
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // storage blocked: the card stays hidden for this visit
  }
}

export function pushCardSnoozed(): boolean {
  if (dismissedNow) return true;
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY));
    return !!at && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}
