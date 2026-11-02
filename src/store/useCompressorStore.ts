import { create } from 'zustand';
import type { OutputFormat } from '../lib/formats';

export type JobStatus = 'waiting' | 'processing' | 'done' | 'failed';
export interface Job {
  id: string;
  file: File;
  previewUrl: string;
  status: JobStatus;
  resultUrl?: string;
  resultName?: string;
  resultSize?: number;
  exifNote?: string | null;
  error?: string;
}
export type Theme = 'dark' | 'light';

interface State {
  jobs: Job[];
  format: OutputFormat;
  quality: number;
  maxWidthOrHeight: number;
  stripMetadata: boolean;
  supportedFormats: OutputFormat[];
  theme: Theme;
  addFiles: (files: File[]) => void;
  removeJob: (id: string) => void;
  clearAll: () => void;
  setSettings: (p: Partial<Pick<State, 'format' | 'quality' | 'maxWidthOrHeight' | 'stripMetadata'>>) => void;
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
  supportedFormats: ['jpeg', 'png', 'webp'],
  theme: (document.documentElement.getAttribute('data-theme') as Theme) || 'dark',
  addFiles: (files) => set((s) => ({
    jobs: [...s.jobs, ...files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(f.name)).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file, previewUrl: URL.createObjectURL(file), status: 'waiting' as JobStatus,
    }))],
  })),
  removeJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  clearAll: () => set({ jobs: [] }),
  setSettings: (p) => set(p),
  setSupportedFormats: (supportedFormats) => set((s) => ({
    supportedFormats,
    format: supportedFormats.includes(s.format) ? s.format : supportedFormats[0],
  })),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pixsqueeze-theme', theme);
    set({ theme });
  },
  updateJob: (id, p) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
}));
