import { FORMAT_MIME, isHeic, type OutputFormat } from './formats';

export interface CompressOptions {
  format: OutputFormat;
  /** 0-100 */
  quality: number;
  /** 0 = keep original size */
  maxWidthOrHeight: number;
  stripMetadata: boolean;
}

async function fileToImageData(file: File): Promise<ImageData> {
  let blob: Blob = file;
  // HEIC is lazy-loaded only when an iPhone photo actually arrives,
  // so normal users never pay for that bundle.
  if (isHeic(file)) {
    const { default: heicTo } = await import('heic-to');
    blob = await heicTo({ blob: file, type: 'image/png' });
  }
  // AVIF input: decode with the same WASM codec used for output.
  if (file.type === 'image/avif' || /\.avif$/i.test(file.name)) {
    const { decode } = await import('@jsquash/avif');
    const decoded = await decode(await blob.arrayBuffer());
    if (!decoded) throw new Error('AVIF decode failed');
    return decoded;
  }
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function resizeImageData(data: ImageData, max: number): ImageData {
  if (!max || Math.max(data.width, data.height) <= max) return data;
  const scale = max / Math.max(data.width, data.height);
  const w = Math.max(1, Math.round(data.width * scale));
  const h = Math.max(1, Math.round(data.height * scale));
  const src = document.createElement('canvas');
  src.width = data.width; src.height = data.height;
  const sctx = src.getContext('2d'); if (!sctx) return data;
  sctx.putImageData(data, 0, 0);
  const dst = document.createElement('canvas'); dst.width = w; dst.height = h;
  const dctx = dst.getContext('2d', { willReadFrequently: true }); if (!dctx) return data;
  dctx.imageSmoothingEnabled = true; dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(src, 0, 0, w, h);
  return dctx.getImageData(0, 0, w, h);
}

function imageDataToBlob(data: ImageData, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = data.width; canvas.height = data.height;
    const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('Canvas unavailable'));
    ctx.putImageData(data, 0, 0);
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Browser cannot encode ${mime}`))), mime, quality);
  });
}

/**
 * Client-only compression. Codecs are lazy-imported per output format,
 * so a JPEG-only user never downloads the AVIF/WebP WASM.
 * stripMetadata is free here: re-encoding from raw ImageData drops
 * EXIF/IPTC/XMP (GPS, camera, timestamps) by construction.
 */
export async function compressImage(file: File, opts: CompressOptions): Promise<Blob> {
  const raw = resizeImageData(await fileToImageData(file), opts.maxWidthOrHeight);
  const q = opts.quality / 100;
  try {
    switch (opts.format) {
      case 'jpeg': {
        const { encode } = await import('@jsquash/jpeg');
        return new Blob([await encode(raw, { quality: opts.quality })], { type: FORMAT_MIME.jpeg });
      }
      case 'webp': {
        const { encode } = await import('@jsquash/webp');
        return new Blob([await encode(raw, { quality: opts.quality })], { type: FORMAT_MIME.webp });
      }
      case 'avif': {
        const { encode } = await import('@jsquash/avif');
        return new Blob([await encode(raw, { quality: opts.quality })], { type: FORMAT_MIME.avif });
      }
      case 'png': {
        // Encode with canvas first, then optimise losslessly with OxiPNG.
        const png = await imageDataToBlob(raw, 'image/png', 1);
        const { optimise } = await import('@jsquash/oxipng');
        const out = await optimise(await png.arrayBuffer(), { level: 2 });
        return new Blob([out], { type: FORMAT_MIME.png });
      }
    }
  } catch (err) {
    // WASM failed (e.g. blocked) — fall back to the native canvas encoder
    // rather than failing the whole job. PNG has no quality knob in canvas.
    console.warn(`[pixsqueeze] WASM ${opts.format} failed, canvas fallback`, err);
    return imageDataToBlob(raw, FORMAT_MIME[opts.format], opts.format === 'png' ? 1 : q);
  }
  throw new Error('Unknown format');
}
