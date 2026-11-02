import exifr from 'exifr';

/** Read-only EXIF summary for display. Nothing is uploaded anywhere. */
export async function readExifSummary(file: File): Promise<string | null> {
  try {
    const data = await exifr.parse(file, { gps: true, tiff: true, exif: true }) as Record<string, unknown> | undefined;
    if (!data) return null;
    const parts: string[] = [];
    if (typeof data.Make === 'string' || typeof data.Model === 'string') parts.push([data.Make, data.Model].filter(Boolean).join(' '));
    if (data.latitude && data.longitude) parts.push('GPS location present');
    if (data.DateTimeOriginal) parts.push(String(data.DateTimeOriginal));
    return parts.length ? parts.join(' · ') : null;
  } catch { return null; }
}
