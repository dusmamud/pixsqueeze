import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose class names: clsx handles conditionals, tailwind-merge makes a
    later utility win instead of both landing in the class list (e.g. a
    `px-3` next to a `px-4` resolves to `px-4`). Unknown classes
    (btn-primary, btn-busy, muted) pass through untouched. Classes are
    passed as separate arguments — never glue an arbitrary Tailwind class
    onto a `${` inside a template literal, or Tailwind v4 never generates
    it (measured before: `min-w-[160px]${...}` produced no CSS). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
export function outputName(original: string, ext: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image';
  return `${base}-compressed.${ext}`;
}
