import { create } from 'zustand';
import type { OutputFormat } from '../lib/formats';
import type { ErrorKey } from '../lib/errors';
import { checkAddLimits, type LimitRejection } from '../lib/limits';

export interface AddFilesResult {
  added: number;
  rejected: LimitRejection[];
}

export type JobStatus = 'waiting' | 'processing' | 'done' | 'failed';
export interface Job {
  id: string;
  file: File;
  previewUrl: string;
  status: JobStatus;
  resultUrl?: string;
  resultName?: string;
  resultSize?: number;
  /** Set when a target size was active: false means the smallest encode still missed it. */
  targetMet?: boolean;
  exifNote?: string | null;
  /** Friendly, translated reason for a failed job (see lib/errors.ts). */
  errorKey?: ErrorKey;
  error?: string;
}
export type Theme = 'dark' | 'light';

interface State {
  jobs: Job[];
  format: OutputFormat;
  quality: number;
  maxWidthOrHeight: number;
  stripMetadata: boolean;
  /** Target output size in KB. 0 = off. */
  targetSizeKb: number;
  supportedFormats: OutputFormat[];
  theme: Theme;
  /** Adds files, enforcing the batch limits (see lib/limits.ts). Returns
      what was added and what the limits rejected, so the caller can tell
      the user which limit stopped a file instead of dropping it silently. */
  addFiles: (files: File[]) => AddFilesResult;
  removeJob: (id: string) => void;
  clearAll: () => void;
  setSettings: (p: Partial<Pick<State, 'format' | 'quality' | 'maxWidthOrHeight' | 'stripMetadata' | 'targetSizeKb'>>) => void;
  setSupportedFormats: (f: OutputFormat[]) => void;
  setTheme: (t: Theme) => void;
  updateJob: (id: string, p: Partial<Job>) => void;
}

export const useCompressorStore = create<State>((set) => ({
  jobs: [],
  format: 'webp',
  quality: 80,
  maxWidthOrHeight: 0,
  stripMetadata: true,
  targetSizeKb: 0,
  supportedFormats: ['jpeg', 'png', 'webp'],
  // Initial theme comes from the <html data-theme> set by the inline script
  // in index.html (avoids a theme flash). Guarded so the store is importable
  // in Node (prerender) where document does not exist.
  theme: ((typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) as Theme) || 'dark',
  addFiles: (files) => {
    const state = useCompressorStore.getState();
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(f.name));
    const { accepted, rejected } = checkAddLimits(
      images,
      state.jobs.length,
      state.jobs.reduce((a, j) => a + j.file.size, 0),
    );
    set((s) => ({
      jobs: [...s.jobs, ...accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file, previewUrl: URL.createObjectURL(file), status: 'waiting' as JobStatus,
      }))],
    }));
    return { added: accepted.length, rejected };
  },
  removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  clearAll: () => set({ jobs: [] }),
  setSettings: (p) => set(p),
  setSupportedFormats: (supportedFormats) => set((s) => ({
    supportedFormats,
    format: supportedFormats.includes(s.format) ? s.format : supportedFormats[0],
  })),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('imgcompressor-theme', theme);
    set({ theme });
  },
  updateJob: (id, p) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
}));
