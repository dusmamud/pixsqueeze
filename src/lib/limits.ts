// Batch limits: generous caps, stated on the dropzone and enforced on
// every add path (drop, file picker, paste). Researched reference points:
// TinyPNG states 20 files / 5 MB each, ImgCompress.app 50 MB per file,
// Mio Compress documents 32 MiB/file, 100 files, 200 MiB/batch. Ours are
// the roomy end of that range — a weak device can still freeze on a huge
// batch with no warning, so a cap has to exist and be visible.
import type { TFunction } from 'i18next';

export const MAX_FILES_PER_BATCH = 100;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_BYTES = 200 * 1024 * 1024;

export type LimitReason = 'fileTooBig' | 'tooMany' | 'batchTooBig';

export interface LimitRejection {
  file: File;
  reason: LimitReason;
}

/** Clean display label for a byte limit: "50 MB", "200 MB". */
export const limitLabel = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
};

export interface LimitCheck {
  accepted: File[];
  rejected: LimitRejection[];
}

/**
 * Split candidate files against the caps, in order, given what is already
 * in the batch. A file is checked per-file size first, then the file-count
 * cap, then the batch total — so the reason names the limit that actually
 * stopped it. Files already over the per-file cap never count toward the
 * count or the batch total.
 */
export function checkAddLimits(
  files: File[],
  existingCount: number,
  existingBytes: number,
): LimitCheck {
  const accepted: File[] = [];
  const rejected: LimitRejection[] = [];
  let acceptedBytes = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ file, reason: 'fileTooBig' });
    } else if (existingCount + accepted.length >= MAX_FILES_PER_BATCH) {
      rejected.push({ file, reason: 'tooMany' });
    } else if (existingBytes + acceptedBytes + file.size > MAX_BATCH_BYTES) {
      rejected.push({ file, reason: 'batchTooBig' });
    } else {
      accepted.push(file);
      acceptedBytes += file.size;
    }
  }
  return { accepted, rejected };
}


// Base keys — i18next picks the _one / _other form from `count`, the same
// pattern as errNotImage.
const REASON_KEYS: Record<LimitReason, string> = {
  fileTooBig: 'errFileTooBig',
  tooMany: 'errTooMany',
  batchTooBig: 'errBatchTooBig',
};

const REASON_LIMITS: Record<LimitReason, string | number> = {
  fileTooBig: limitLabel(MAX_FILE_BYTES),
  tooMany: MAX_FILES_PER_BATCH,
  batchTooBig: limitLabel(MAX_BATCH_BYTES),
};

/**
 * One alert string for a set of limit rejections, grouped by reason so a
 * mixed batch reads as one sentence per limit instead of one per file.
 * Empty string when nothing was rejected.
 */
export function limitRejectionMessage(t: TFunction, rejected: LimitRejection[]): string {
  const parts: string[] = [];
  (Object.keys(REASON_KEYS) as LimitReason[]).forEach((reason) => {
    const group = rejected.filter((r) => r.reason === reason);
    if (!group.length) return;
    const keys = REASON_KEYS[reason];
    parts.push(
      t(keys, {
        count: group.length,
        name: group[0].file.name,
        limit: REASON_LIMITS[reason],
      }),
    );
  });
  return parts.join(' ');
}
