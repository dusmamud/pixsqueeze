import { UploadCloud, SlidersHorizontal, Zap, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';

const ICONS = [UploadCloud, SlidersHorizontal, Zap, Download];

export default function Stepper() {
  const { t } = useTranslation();
  const jobs = useCompressorStore((s) => s.jobs);
  const keys = ['stepUpload', 'stepAdjust', 'stepCompress', 'stepDownload'] as const;
  // Flow state, never colour-only: number + label + completed check.
  let current = 0;
  if (jobs.length > 0) current = 1;
  if (jobs.some((j) => j.status === 'processing' || j.status === 'done')) current = 2;
  if (jobs.length > 0 && jobs.every((j) => j.status === 'done')) current = 3;
  return (
    <nav aria-label="Progress" className="mx-auto flex max-w-xl items-start justify-between">
      {keys.map((key, i) => {
        const Icon = ICONS[i];
        const done = i < current;
        const active = i === current;
        return (
          <div key={key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className="relative grid h-10 w-10 place-items-center rounded-full text-sm font-bold" style={{ background: done || active ? 'var(--accent)' : 'var(--surface-2)', color: done || active ? 'var(--accent-text)' : 'var(--muted)' }}>
              {done ? '✓' : <Icon size={18} />}
            </span>
            <span className={`text-xs font-medium ${active ? '' : 'muted'}`}>{i + 1}. {t(key)}</span>
          </div>
        );
      })}
    </nav>
  );
}
