import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import DropzoneArea from '../components/DropzoneArea';
import SettingsPanel from '../components/SettingsPanel';
import ImageCard from '../components/ImageCard';
import Stepper from '../components/Stepper';
import { useCompressorStore, type Job } from '../store/useCompressorStore';
import { detectSupportedFormats, FORMAT_EXT, formatBytes } from '../lib/formats';
import { compressImage } from '../lib/compress';
import { readExifSummary } from '../lib/metadata';
import { downloadAsZip } from '../lib/download';
import { outputName as outName } from '../lib/utils';

// Tool-first page: the headline IS the tool header. No separate hero,
// no demo slider, no showcase sections — drop, adjust, compress, download.
export default function HomePage() {
  const { t } = useTranslation();
  const s = useCompressorStore();
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [summary, setSummary] = useState<{ count: number; original: number; compressed: number } | null>(null);

  useEffect(() => { void detectSupportedFormats().then((f) => s.setSupportedFormats(f)); }, []);
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length) useCompressorStore.getState().addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const compressOne = async (job: Job): Promise<boolean> => {
    s.updateJob(job.id, { status: 'processing' });
    try {
      const exifNote = await readExifSummary(job.file);
      const blob = await compressImage(job.file, { format: s.format, quality: s.quality, maxWidthOrHeight: s.maxWidthOrHeight, stripMetadata: s.stripMetadata });
      s.updateJob(job.id, { status: 'done', resultUrl: URL.createObjectURL(blob), resultName: outName(job.file.name, FORMAT_EXT[s.format]), resultSize: blob.size, exifNote });
      return true;
    } catch (e) {
      s.updateJob(job.id, { status: 'failed', error: e instanceof Error ? e.message : 'Failed' });
      return false;
    }
  };

  const compressAll = async () => {
    const queue = s.jobs.filter((j) => j.status !== 'done');
    if (!queue.length || batchRunning) return;
    setBatchRunning(true); setBatchTotal(queue.length); setBatchDone(0); setSummary(null);
    for (let i = 0; i < queue.length; i++) { await compressOne(queue[i]); setBatchDone(i + 1); }
    const done = useCompressorStore.getState().jobs.filter((j) => j.status === 'done' && j.resultSize !== undefined);
    setSummary({ count: done.length, original: done.reduce((a, j) => a + j.file.size, 0), compressed: done.reduce((a, j) => a + (j.resultSize ?? 0), 0) });
    setBatchRunning(false);
  };

  const downloadAllZip = async () => {
    const done = s.jobs.filter((j) => j.resultUrl && j.resultName);
    const files = await Promise.all(done.map(async (j) => ({ name: j.resultName!, blob: await fetch(j.resultUrl!).then((r) => r.blob()) })));
    if (files.length) void downloadAsZip(files, 'imgcompressor-compressed.zip');
  };

  const trySample = async () => {
    const blob = await fetch('/sample.png').then((r) => r.blob());
    s.addFiles([new File([blob], 'sample-image.png', { type: 'image/png' })]);
  };

  const savedPct = summary && summary.original ? Math.round((1 - summary.compressed / summary.original) * 100) : 0;
  const doneCount = s.jobs.filter((j) => j.status === 'done').length;

  return (
    <div className="mx-auto max-w-4xl">
      <section className="py-8 text-center sm:py-10">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="text-3xl font-bold sm:text-4xl">{t('heroTitle')}</motion.h1>
        <p className="muted mx-auto mt-3 max-w-xl text-sm sm:text-base">{t('heroSub')}</p>
      </section>

      <Stepper />

      <section className="card mt-6 space-y-5 p-4 sm:p-6">
        <DropzoneArea />
        <SettingsPanel />
        {batchRunning && (
          <div aria-live="polite">
            <p className="text-sm font-medium">{t('compressingCount')} {batchDone} {t('of')} {batchTotal}…</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
              <motion.div className="h-full rounded-full" style={{ background: 'var(--accent)' }} animate={{ width: batchTotal ? `${(batchDone / batchTotal) * 100}%` : '0%' }} transition={{ duration: 0.3 }} />
            </div>
          </div>
        )}
        <AnimatePresence>
          {summary && !batchRunning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
              <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 style={{ color: 'var(--accent)' }} /> {t('batchDone')} {summary.count} images · {t('totalOriginal')}: {formatBytes(summary.original)} → {t('totalCompressed')}: {formatBytes(summary.compressed)} · {savedPct}% {t('saved')}</p>
              <button className="btn-primary text-sm" onClick={() => void downloadAllZip()}>{t('downloadAll')}</button>
            </motion.div>
          )}
        </AnimatePresence>
        {s.jobs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{s.jobs.length} {t('jobsCount')} · {doneCount} {t('done')}</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary text-sm" disabled={batchRunning} onClick={() => void compressAll()}>
                {batchRunning && <Loader2 className="mr-2 animate-spin" size={16} />}{batchRunning ? `${t('compressingCount')}…` : t('compressAll')}
              </button>
              <button className="btn-ghost text-sm" disabled={!doneCount} onClick={() => void downloadAllZip()}>{t('downloadAll')}</button>
              <button className="btn-ghost text-sm" onClick={s.clearAll}>{t('clearAll')}</button>
            </div>
          </div>
        )}
        {s.jobs.length === 0 ? (
          <div className="py-4 text-center">
            <p className="muted">{t('noImages')}</p>
            <button className="btn-ghost mt-4" onClick={() => void trySample()}>{t('trySample')}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {s.jobs.map((job) => <ImageCard key={job.id} job={job} onRetry={(j) => void compressOne(j)} />)}
            </AnimatePresence>
          </div>
        )}
      </section>

    </div>
  );
}
