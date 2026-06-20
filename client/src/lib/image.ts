import type { CSSProperties } from 'react';

/** Checkerboard background to indicate transparency behind an image. */
export const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0,0 6px,6px -6px,-6px 0',
  backgroundColor: '#ffffff',
};

/**
 * Downscale a base64 image data URL to a small JPEG thumbnail for gallery grids.
 * Keeps aspect ratio; caps the longest side at `maxSize` px.
 */
export function makeThumbnail(dataURL: string, maxSize = 320, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2D context'));
      ctx.drawImage(img, 0, 0, w, h);
      // PNG preserves transparency (for cut-out images); JPEG is lighter for opaque ones
      resolve(format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataURL;
  });
}

/** Read a File as a base64 data URL. */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}
