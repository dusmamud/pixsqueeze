import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { ShieldCheck, Zap, Layers, SlidersHorizontal, ImageDown, WifiOff, CheckCircle2, Loader2 } from 'lucide-react';
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

const FEATURES = [
  { icon: ShieldCheck, title: 'feat1Title', text: 'feat1Text' },
  { icon: Zap, title: 'feat2Title', text: 'feat2Text' },
  { icon: Layers, title: 'feat3Title', text: 'feat3Text' },
  { icon: SlidersHorizontal, title: 'feat4Title', text: 'feat4Text' },
  { icon: ImageDown, title: 'feat5Title', text: 'feat5Text' },
  { icon: WifiOff, title: 'feat6Title', text: 'feat6Text' },
] as const;

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
    <div>
      {/* Hero: text + live before/after demo, not a bare headline. */}
      <section className="hero-glow relative overflow-hidden rounded-3xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <span className="card inline-flex !rounded-full px-3 py-1.5 text-xs font-semibold">🔒 {t('heroBadge')}</span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">{t('heroTitle')}</h1>
            <p className="muted mt-4 max-w-lg text-base sm:text-lg">{t('heroSub')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#tool" className="btn-primary">{t('startCompressing')}</a>
              <button className="btn-ghost" onClick={() => void trySample()}>{t('trySample')}</button>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
              <div><p className="text-xl font-bold">0</p><p className="muted text-xs">{t('statUploads')}</p></div>
              <div><p className="text-xl font-bold">4</p><p className="muted text-xs">{t('statFormats')}</p></div>
              <div><p className="text-xl font-bold">2</p><p className="muted text-xs">{t('statLanguages')}</p></div>
              <div><p className="text-xl font-bold">✓</p><p className="muted text-xs">{t('statOffline')}</p></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="card overflow-hidden p-3">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src="/sample.png" alt={t('demoOriginal')} />}
              itemTwo={<ReactCompareSliderImage src="/sample-compressed.webp" alt={t('demoCompressed')} />}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-3 text-xs">
              <span><b>{t('demoOriginal')}</b>: 190 KB</span>
              <span><b>{t('demoCompressed')}</b>: 82 KB · 57% {t('saved')}</span>
            </div>
            <p className="muted px-2 pb-1 text-xs">{t('demoCaption')}</p>
          </motion.div>
        </div>
      </section>

      <div className="mt-10"><Stepper /></div>

      {/* Tool: sidebar settings on desktop, stacked on mobile/tablet. */}
      <section id="tool" className="mt-10 scroll-mt-24">
        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24"><SettingsPanel /></div>
          <div className="min-w-0 space-y-4">
            <DropzoneArea />
            {batchRunning && (
              <div aria-live="polite" className="card p-4">
                <p className="text-sm font-medium">{t('compressingCount')} {batchDone} {t('of')} {batchTotal}…</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: 'var(--accent)' }} animate={{ width: batchTotal ? `${(batchDone / batchTotal) * 100}%` : '0%' }} transition={{ duration: 0.3 }} />
                </div>
              </div>
            )}
            <AnimatePresence>
              {summary && !batchRunning && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 style={{ color: 'var(--accent)' }} /> {t('batchDone')} {summary.count} images · {t('totalOriginal')}: {formatBytes(summary.original)} → {t('totalCompressed')}: {formatBytes(summary.compressed)} · {savedPct}% {t('saved')}</p>
                  <button className="btn-primary text-sm" onClick={() => void downloadAllZip()}>{t('downloadAll')}</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticky batch bar: actions stay reachable while scrolling a long queue. */}
            {s.jobs.length > 0 && (
              <div className="card sticky top-[72px] z-20 flex flex-wrap items-center justify-between gap-3 p-3">
                <p className="text-sm font-medium">{s.jobs.length} {t('jobsCount')} · {doneCount} {t('done')}</p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary !min-h-0 !px-4 !py-2 text-sm" disabled={batchRunning} onClick={() => void compressAll()}>
                    {batchRunning && <Loader2 className="mr-2 animate-spin" size={16} />}{batchRunning ? `${t('compressingCount')}…` : t('compressAll')}
                  </button>
                  <button className="btn-ghost !min-h-0 !px-4 !py-2 text-sm" disabled={!doneCount} onClick={() => void downloadAllZip()}>{t('downloadAll')}</button>
                  <button className="btn-ghost !min-h-0 !px-4 !py-2 text-sm" onClick={s.clearAll}>{t('clearAll')}</button>
                </div>
              </div>
            )}

            {s.jobs.length === 0 ? (
              <div className="card py-10 text-center">
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
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold sm:text-3xl">{t('featuresTitle')}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35, delay: i * 0.05 }} className="card p-5">
              <f.icon size={22} style={{ color: 'var(--accent)' }} />
              <h3 className="mt-3 font-semibold">{t(f.title)}</h3>
              <p className="muted mt-1 text-sm leading-relaxed">{t(f.text)}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
