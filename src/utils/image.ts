/**
 * Crops an image file to a centred `size` × `height` box (a square by default)
 * and returns a small JPEG data URL (kept well under Firestore's 1 MB limit).
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
