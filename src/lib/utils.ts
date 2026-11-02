export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
export function outputName(original: string, ext: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image';
  return `${base}-compressed.${ext}`;
}
