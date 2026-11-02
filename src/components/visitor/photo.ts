/**
 * Smaller WebP copies of the club photos live in public/photos/webp/<name>-600.webp and -1200.webp
 * (regenerate them when a photo in public/photos changes). Returns the srcset for <img>, or
 * undefined for any other image (uploads, data URLs…), which then loads as before.
 */
export function photoSrcSet(src: string | undefined): string | undefined {
  const m = src?.match(/^\/photos\/([\w-]+)\.(jpe?g)$/);
  return m ? `/photos/webp/${m[1]}-600.webp 600w, /photos/webp/${m[1]}-1200.webp 1200w` : undefined;
}
