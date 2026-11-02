// Runtime format detection — the 2x2 canvas trick.
// Never claim a format is supported and silently fall back: only offer
// formats this exact browser can actually encode via canvas.toBlob.
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export const FORMAT_MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export const FORMAT_EXT: Record<OutputFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};

function canvasCanEncode(mime: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 2; canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(false);
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 2, 2);
      canvas.toBlob((blob) => resolve(!!blob && blob.type === mime), mime, 0.9);
    } catch { resolve(false); }
  });
}

let cache: OutputFormat[] | null = null;

/** JPEG/PNG are universal; WebP/AVIF are probed at runtime. */
export async function detectSupportedFormats(): Promise<OutputFormat[]> {
  if (cache) return cache;
  const out: OutputFormat[] = ['jpeg', 'png'];
  if (await canvasCanEncode('image/webp')) out.push('webp');
  if (await canvasCanEncode('image/avif')) out.push('avif');
  cache = out;
  return out;
}

export function isHeic(file: File): boolean {
  return /\.hei(c|f)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
}
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export function savedPercent(original: number, compressed: number): number {
  if (!original) return 0;
  return Math.round((1 - compressed / original) * 100);  // may be negative: already-tiny files can grow
}
