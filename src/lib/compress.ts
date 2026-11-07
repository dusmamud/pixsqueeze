import { FORMAT_MIME, isHeic, type OutputFormat } from './formats';

export interface CompressOptions {
  format: OutputFormat;
  /** 0-100 */
  quality: number;
  /** 0 = keep original size */
  maxWidthOrHeight: number;
  stripMetadata: boolean;
  /** Target output size in KB. 0 = off — plain quality-based compression. */
  targetSizeKb?: number;
}

export interface CompressResult {
  blob: Blob;
  /** False when even the smallest encode could not fit under the target. */
  targetMet: boolean;
  /** Quality (0-100) the returned encode was made at. 100 for PNG (lossless). */
  qualityUsed: number;
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

async function encodeImageData(raw: ImageData, format: OutputFormat, quality: number): Promise<Blob> {
  const q = quality / 100;
  try {
    switch (format) {
      case 'jpeg': {
        const { encode } = await import('@jsquash/jpeg');
        return new Blob([await encode(raw, { quality })], { type: FORMAT_MIME.jpeg });
      }
      case 'webp': {
        const { encode } = await import('@jsquash/webp');
        return new Blob([await encode(raw, { quality })], { type: FORMAT_MIME.webp });
      }
      case 'avif': {
        const { encode } = await import('@jsquash/avif');
        return new Blob([await encode(raw, { quality })], { type: FORMAT_MIME.avif });
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
    console.warn(`[imgcompressor] WASM ${format} failed, canvas fallback`, err);
    return imageDataToBlob(raw, FORMAT_MIME[format], format === 'png' ? 1 : q);
  }
  throw new Error('Unknown format');
}

// Lowest quality the target search will try. Matches the quality slider's
// own minimum, so the search never goes below what the UI already allows.
const FLOOR_Q = 10;
// Binary search over quality: log2(100) ≈ 6.64, so 6 steps collapse the
// range; AVIF encodes are slow, so it gets 5 steps and fewer resize passes.
const TOLERANCE = 0.05; // stop once within 5% under the target
const MIN_DIMENSION = 64; // never downscale below this long edge

/**
 * Target-size compression, following the standard practice (binary search
 * over quality, downscale when quality alone cannot reach the target):
 * the contract is a ceiling — output is at or below the target, never
 * padded to hit it exactly — and the result reports its actual size.
 * If the target is unreachable, the smallest encode found is returned
 * with targetMet: false, so the UI can say so honestly instead of failing.
 */
async function compressToTarget(raw: ImageData, opts: CompressOptions, targetBytes: number): Promise<CompressResult> {
  const maxIter = opts.format === 'avif' ? 5 : 6;
  const maxPasses = opts.format === 'avif' ? 3 : 4;
  const encodeAt = (data: ImageData, q: number) => encodeImageData(data, opts.format, q);

  // PNG is lossless: quality changes nothing, so only resizing can shrink it.
  if (opts.format === 'png') {
    let data = raw;
    let smallest = await encodeAt(data, 100);
    if (smallest.size <= targetBytes) return { blob: smallest, targetMet: true, qualityUsed: 100 };
    for (let i = 0; i < 6; i++) {
      // Bytes scale with pixel area, so scale the edge by the square root.
      const scale = Math.sqrt((targetBytes * 0.9) / smallest.size);
      const nextMax = Math.max(MIN_DIMENSION, Math.floor(Math.max(data.width, data.height) * Math.min(scale, 0.9)));
      if (nextMax >= Math.max(data.width, data.height)) break;
      data = resizeImageData(data, nextMax);
      const b = await encodeAt(data, 100);
      if (b.size < smallest.size) smallest = b;
      if (b.size <= targetBytes) return { blob: b, targetMet: true, qualityUsed: 100 };
      if (nextMax <= MIN_DIMENSION) break;
    }
    return { blob: smallest, targetMet: false, qualityUsed: 100 };
  }

  let data = raw;
  let smallest: Blob | null = null;
  for (let pass = 0; pass < maxPasses; pass++) {
    // 1. Encode at the user's quality first — never degrade a file that
    // already fits.
    const hi = await encodeAt(data, opts.quality);
    if (hi.size <= targetBytes) return { blob: hi, targetMet: true, qualityUsed: opts.quality };
    if (!smallest || hi.size < smallest.size) smallest = hi;
    // 2. Floor probe: if even the lowest quality is too big, searching
    // this resolution is doomed — skip it and resize instead.
    const floor = await encodeAt(data, FLOOR_Q);
    if (floor.size <= targetBytes) {
      let lo = FLOOR_Q, hiQ = opts.quality, best = floor, bestQ = FLOOR_Q;
      for (let i = 0; i < maxIter; i++) {
        const mid = Math.floor((lo + hiQ) / 2);
        if (mid <= lo || mid >= hiQ) break;
        const b = await encodeAt(data, mid);
        if (!smallest || b.size < smallest.size) smallest = b;
        if (b.size <= targetBytes) {
          best = b; bestQ = mid;
          if (b.size >= targetBytes * (1 - TOLERANCE)) break; // close enough
          lo = mid + 1;
        } else {
          hiQ = mid - 1;
        }
        if (lo > hiQ) break;
      }
      return { blob: best, targetMet: true, qualityUsed: bestQ };
    }
    if (!smallest || floor.size < smallest.size) smallest = floor;
    // 3. Quality alone cannot do it — shrink the pixels and search again.
    const scale = Math.sqrt((targetBytes * 0.9) / floor.size);
    const nextMax = Math.max(MIN_DIMENSION, Math.floor(Math.max(data.width, data.height) * Math.min(scale, 0.9)));
    if (nextMax >= Math.max(data.width, data.height)) break;
    data = resizeImageData(data, nextMax);
  }
  return { blob: smallest ?? await encodeAt(raw, opts.quality), targetMet: false, qualityUsed: FLOOR_Q };
}

/**
 * Client-only compression. Codecs are lazy-imported per output format,
 * so a JPEG-only user never downloads the AVIF/WebP WASM.
 * stripMetadata is free here: re-encoding from raw ImageData drops
 * EXIF/IPTC/XMP (GPS, camera, timestamps) by construction.
 */
export async function compressImage(file: File, opts: CompressOptions): Promise<CompressResult> {
  const raw = resizeImageData(await fileToImageData(file), opts.maxWidthOrHeight);
  const targetBytes = opts.targetSizeKb && opts.targetSizeKb > 0 ? Math.round(opts.targetSizeKb * 1024) : 0;
  if (!targetBytes) {
    return { blob: await encodeImageData(raw, opts.format, opts.quality), targetMet: true, qualityUsed: opts.quality };
  }
  return compressToTarget(raw, opts, targetBytes);
}
