/**
 * When a visitor leaves the 3D museum, the home page scrolls back to the section they came from.
 * Kept apart from the museum so the home page does not load three.js to read it.
 */
const KEY = 'dcj-return-to';

export function rememberReturn(sectionId: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id: sectionId, at: Date.now() }));
  } catch {
    /* private mode: the page simply opens at the top */
  }
}

/** The section to scroll to, if the visitor just came back (and forgets it) */
export function takeReturn(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const v = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
    return v && Date.now() - v.at < 15_000 ? v.id : null;
  } catch {
    return null;
  }
}
