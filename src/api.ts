import { getSessionToken } from './session';
import { translate } from './i18n';
import { toastMessages } from './i18n/messages/toasts';

/** A request that has not answered by then is abandoned, so buttons never spin forever. */
const TIMEOUT_MS = 20_000;

/** An error answered by the API; `status` is the HTTP status (401, 409…). */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Calls our backend, attaching the signed-in user's session token. */
export async function api<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const token = getSessionToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    // A change may still have reached the server, so the message asks to check before retrying
    if (controller.signal.aborted) throw new Error(translate(toastMessages, 'requestTimeout'));
    throw new Error(translate(toastMessages, 'networkError'));
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`, res.status);
  return data as T;
}
