/** Friendly, translated error messages for compression failures.
 * The engine throws technical English messages; the UI shows these
 * locale keys instead, so users get a reason they can act on. */
export type ErrorKey =
  | 'errUnreadable'
  | 'errEncode'
  | 'errAvifDecode'
  | 'errHeic'
  | 'errCanvas'
  | 'errGeneric';

export function errorKeyFor(err: unknown): ErrorKey {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/AVIF decode failed/i.test(msg)) return 'errAvifDecode';
  if (/heic|heif/i.test(msg)) return 'errHeic';
  if (/Browser cannot encode/i.test(msg)) return 'errEncode';
  if (/Canvas 2D|Canvas unavailable/i.test(msg)) return 'errCanvas';
  if (/createImageBitmap|decode|bitmap/i.test(msg)) return 'errUnreadable';
  return 'errGeneric';
}
