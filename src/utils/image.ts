/**
 * Crops an image file to a centred `size` × `height` box (a square by default)
 * and returns a small JPEG data URL (small, so the request and the stored image stay light).
 */
export function resizePhoto(file: File, size = 320, height = size): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Largest centred area of the source with the target's aspect ratio
      const scale = Math.min(img.width / size, img.height / height);
      const sw = size * scale;
      const sh = height * scale;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('This file is not an image'));
    img.src = url;
  });
}

/**
 * Shrinks an image file, keeping its shape, so its longest side is at most `maxSide`
 * (photos of the public site: hero, albums). Returns a JPEG data URL and its size.
 */
export function shrinkPhoto(file: File, maxSide = 1600, quality = 0.85): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), w, h });
    };
    img.onerror = () => reject(new Error('This file is not an image'));
    img.src = url;
  });
}
