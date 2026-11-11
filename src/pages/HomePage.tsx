import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { ShieldCheck, Zap, Layers, SlidersHorizontal, ImageDown, WifiOff, CheckCircle2, Loader2, Lock, Check, TriangleAlert, X, ChevronDown } from 'lucide-react';
import DropzoneArea from '../components/DropzoneArea';
import SettingsPanel from '../components/SettingsPanel';
import ImageCard from '../components/ImageCard';
import Reveal from '../components/Reveal';
import Stepper from '../components/Stepper';
import { useCompressorStore, type Job } from '../store/useCompressorStore';
import { detectSupportedFormats, FORMAT_EXT, formatBytes } from '../lib/formats';
import { limitRejectionMessage } from '../lib/limits';
import { compressImage } from '../lib/compress';
import { errorKeyFor } from '../lib/errors';
import { readExifSummary } from '../lib/metadata';
import { downloadAsZip } from '../lib/download';
import { cn, outputName as outName } from '../lib/utils';

const FEATURES = [
  { icon: ShieldCheck, title: 'feat1Title', text: 'feat1Text' },
  { icon: Zap, title: 'feat2Title', text: 'feat2Text' },
  { icon: Layers, title: 'feat3Title', text: 'feat3Text' },
  { icon: SlidersHorizontal, title: 'feat4Title', text: 'feat4Text' },
  { icon: ImageDown, title: 'feat5Title', text: 'feat5Text' },
  { icon: WifiOff, title: 'feat6Title', text: 'feat6Text' },
] as const;

const FAQ_ITEMS = [['faqQ1', 'faqA1'], ['faqQ2', 'faqA2'], ['faqQ3', 'faqA3'], ['faqQ4', 'faqA4']] as const;

const isPasteAccepted = (f: File) =>
  ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'].includes(f.type.toLowerCase()) ||
  /\.(jpe?g|png|webp|avif|heic|heif)$/i.test(f.name);

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const s = useCompressorStore();
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [summary, setSummary] = useState<{ count: number; original: number; compressed: number } | null>(null);
  const [zipRunning, setZipRunning] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  // App-level notice for errors that belong to no single job (sample
  // image, ZIP download). Shown once, dismissible, announced to AT.
  const [notice, setNotice] = useState<string | null>(null);
  // A pasted file outside the supported list (e.g. an animated GIF) gets
  // the same rejection the dropzone shows, instead of becoming a job.
  const [pasteRejected, setPasteRejected] = useState<string | null>(null);

  useEffect(() => { void detectSupportedFormats().then((f) => s.setSupportedFormats(f)).catch(() => undefined); }, []);
  useEffect(() => {
    // Paste used to bypass the dropzone's accept list: a GIF was silently
    // accepted and its animation discarded on encode. Validate against the
    // same list (mime OR extension — clipboard images often lack one).
    const onPaste = (e: ClipboardEvent) => {
      const images = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (!images.length) return;
      const valid = images.filter(isPasteAccepted);
      const typeRejected = images.filter((f) => !isPasteAccepted(f));
      const parts: string[] = [];
      if (typeRejected.length) parts.push(i18n.t('errNotImage', { count: typeRejected.length, name: typeRejected[0].name }));
      // addFiles also enforces the batch limits — a pasted file the limits
      // stop gets the same named-limit alert as a dropped one.
      if (valid.length) {
        const res = useCompressorStore.getState().addFiles(valid);
        const limitMsg = limitRejectionMessage(i18n.t.bind(i18n), res.rejected);
        if (limitMsg) parts.push(limitMsg);
      }
      setPasteRejected(parts.length ? parts.join(' ') : null);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const compressOne = async (job: Job): Promise<boolean> => {
    s.updateJob(job.id, { status: 'processing' });
    try {
      const exifNote = await readExifSummary(job.file);
      const res = await compressImage(job.file, { format: s.format, quality: s.quality, maxWidthOrHeight: s.maxWidthOrHeight, stripMetadata: s.stripMetadata, targetSizeKb: s.targetSizeKb });
      s.updateJob(job.id, { status: 'done', resultUrl: URL.createObjectURL(res.blob), resultName: outName(job.file.name, FORMAT_EXT[s.format]), resultSize: res.blob.size, exifNote, targetMet: s.targetSizeKb > 0 ? res.targetMet : undefined });
      return true;
    } catch (e) {
      s.updateJob(job.id, { status: 'failed', error: e instanceof Error ? e.message : 'Failed', errorKey: errorKeyFor(e) });
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
    if (zipRunning) return;
    setZipRunning(true);
    try {
      const done = s.jobs.filter((j) => j.resultUrl && j.resultName);
      const files = await Promise.all(done.map(async (j) => ({ name: j.resultName!, blob: await fetch(j.resultUrl!).then((r) => r.blob()) })));
      if (files.length) { await downloadAsZip(files, 'imgcompressor-compressed.zip'); setNotice(null); toast.success(t('toastZipDone')); }
    } catch {
      setNotice('errZip');
    } finally {
      setZipRunning(false);
    }
  };

  const trySample = async () => {
    if (sampleLoading) return;
    setSampleLoading(true);
    try {
      const res = await fetch('/sample.png');
      if (!res.ok) throw new Error(`Sample image failed: ${res.status}`);
      const blob = await res.blob();
      setNotice(null);
      s.addFiles([new File([blob], 'sample-image.png', { type: 'image/png' })]);
    } catch {
      setNotice('errSample');
    } finally {
      setSampleLoading(false);
    }
  };

  const savedPct = summary && summary.original ? Math.round((1 - summary.compressed / summary.original) * 100) : 0;
  const doneCount = s.jobs.filter((j) => j.status === 'done').length;
  const failedCount = s.jobs.filter((j) => j.status === 'failed').length;
  // Jobs left to compress: 'waiting' or 'failed' (retry). When this is 0
  // every job is done and the Compress-all button dims instead of staying
  // fully green — clicking it would do nothing (compressAll early-returns
  // on an empty queue), so it must not look active.
  const pendingCount = s.jobs.filter((j) => j.status !== 'done').length;

  return (
    <div>
      {/* Hero: text + live before/after demo, not a bare headline. */}
      <section className="px-4 py-12 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <p className="muted mono flex items-center gap-2 text-xs font-medium"><Lock size={14} aria-hidden="true" />{t('heroBadge')}</p>
            <h1 className="mt-5 text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">{t('heroTitle')}</h1>
            <p className="muted mt-4 max-w-lg text-base sm:text-lg">{t('heroSub')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#tool" className="btn-primary">{t('startCompressing')}</a>
              <button className={cn('btn-ghost', sampleLoading && 'btn-busy')} disabled={sampleLoading} aria-busy={sampleLoading} onClick={() => void trySample()}>{sampleLoading && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}{t('trySample')}</button>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
              <div><p className="mono text-xl font-medium">0</p><p className="muted text-xs">{t('statUploads')}</p></div>
              <div><p className="mono text-xl font-medium">{s.supportedFormats.length}</p><p className="muted text-xs">{t('statFormats')}</p></div>
              <div><p className="mono text-xl font-medium">2</p><p className="muted text-xs">{t('statLanguages')}</p></div>
              <div><p className="flex h-7 items-center text-xl font-medium"><Check size={20} aria-hidden="true" /></p><p className="muted text-xs">{t('statOffline')}</p></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="card overflow-hidden p-3">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src="/sample.png" alt={t('demoOriginal')} />}
              itemTwo={<ReactCompareSliderImage src="/sample-compressed.webp" alt={t('demoCompressed')} />}
            />
            <div className="mono flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-3 text-xs">
              <span><b>{t('demoOriginal')}</b>: 190 KB</span>
              <span><b>{t('demoCompressed')}</b>: 82 KB · 57% {t('saved')}</span>
            </div>
            <p className="muted px-2 pb-1 text-xs">{t('demoCaption')}</p>
          </motion.div>
        </div>
      </section>

      <Stepper />

      {/* Tool: sidebar settings on desktop, stacked on mobile/tablet.
          Progressive disclosure: the settings configure the images, so
          they appear only once an image exists — with no images the panel
          is hidden instead of showing controls that do nothing. */}
      <section id="tool" className="mt-12 scroll-mt-4">
        <h2 className="text-2xl font-medium sm:text-3xl">{t('toolTitle')}</h2>
        <div className={cn('mt-6 grid items-start gap-5', s.jobs.length > 0 && 'lg:grid-cols-[340px_minmax(0,1fr)]')}>
          {s.jobs.length > 0 && (
            <div className="lg:sticky lg:top-4"><SettingsPanel /></div>
          )}
          <div className="min-w-0 space-y-4">
            {notice && (
              <div role="alert" className="alert">
                <TriangleAlert size={16} className="mt-px shrink-0" style={{ color: 'var(--danger)' }} aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm">{t(notice)}</p>
                <button aria-label={t('dismiss')} className="shrink-0 rounded-lg p-1" onClick={() => setNotice(null)}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            {pasteRejected && (
              <div role="alert" className="alert">
                <TriangleAlert size={16} className="mt-px shrink-0" style={{ color: 'var(--danger)' }} aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm">{pasteRejected}</p>
                <button aria-label={t('dismiss')} className="shrink-0 rounded-lg p-1" onClick={() => setPasteRejected(null)}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            <DropzoneArea />
            {batchRunning && (
              <div aria-live="polite" className="card p-4">
                <p className="text-sm font-medium">{t('compressingCount')} {batchDone} {t('of')} {batchTotal}…</p>
                <div role="progressbar" aria-valuenow={batchDone} aria-valuemin={0} aria-valuemax={batchTotal} aria-label={t('compressingCount')} className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full" style={{ background: 'var(--accent)', transform: `scaleX(${batchTotal ? batchDone / batchTotal : 0})`, transformOrigin: 'left', transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                </div>
              </div>
            )}
            <AnimatePresence>
              {summary && !batchRunning && (
                <motion.div role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 style={{ color: 'var(--accent)' }} aria-hidden="true" /> {t('batchDone')} {summary.count} {t('jobsCount', { count: summary.count })} · {t('totalOriginal')}: {formatBytes(summary.original)} → {t('totalCompressed')}: {formatBytes(summary.compressed)} · {savedPct}% {t('saved')}{failedCount > 0 ? ` · ${failedCount} ${t('batchFailed')}` : ''}</p>
                  <button className={cn('btn-primary text-sm', zipRunning && 'btn-busy')} disabled={zipRunning} aria-busy={zipRunning} onClick={() => void downloadAllZip()}>{zipRunning && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}{zipRunning ? t('downloading') : t('downloadAll')}</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticky batch bar: actions stay reachable while scrolling a long queue. */}
            {s.jobs.length > 0 && (
              <div className="card sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 p-3">
                <p className="text-sm font-medium">{s.jobs.length} {t('jobsCount', { count: s.jobs.length })} · {doneCount} {t('done')}</p>
                <div className="flex flex-wrap gap-2">
                  <button className={cn('btn-primary btn-compress text-sm', batchRunning && 'btn-busy')} disabled={batchRunning || pendingCount === 0} aria-busy={batchRunning} onClick={() => void compressAll()}>
                    {batchRunning && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}{batchRunning ? `${t('compressingCount')}…` : t('compressAll')}
                  </button>
                  <button className={cn('btn-ghost text-sm', zipRunning && 'btn-busy')} disabled={zipRunning || !doneCount} aria-busy={zipRunning} onClick={() => void downloadAllZip()}>{zipRunning && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}{zipRunning ? t('downloading') : t('downloadAll')}</button>
                  <button className="btn-ghost text-sm" onClick={s.clearAll}>{t('clearAll')}</button>
                </div>
              </div>
            )}

            {s.jobs.length === 0 ? (
              <div className="card py-10 text-center">
                <p className="muted">{t('noImages')}</p>
                <button className={cn('btn-ghost mt-4', sampleLoading && 'btn-busy')} disabled={sampleLoading} aria-busy={sampleLoading} onClick={() => void trySample()}>{sampleLoading && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}{t('trySample')}</button>
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

      {/* How it works: the same three steps as the stepper, as plain text
          for readers and crawlers — the stepper above is visual, this is
          the readable version. Copy reuses the how* keys (dead until now). */}
      <Reveal className="mt-12">
      <section>
        <h2 className="text-2xl font-medium sm:text-3xl">{t('howTitle')}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {(['how1', 'how2', 'how3'] as const).map((k) => (
            <div key={k}>
              <h3 className="font-medium">{t(`${k}Title`)}</h3>
              <p className="muted mt-1 text-sm leading-relaxed">{t(`${k}Text`)}</p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      <Reveal className="mt-12">
      <section>
        <h2 className="text-2xl font-medium sm:text-3xl">{t('featuresTitle')}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <f.icon size={18} className="muted" aria-hidden="true" />
              <h3 className="mt-3 font-medium">{t(f.title)}</h3>
              <p className="muted mt-1 text-sm leading-relaxed">{t(f.text)}</p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      {/* FAQ on home: same Q&As as the /faq page, as native disclosures —
          keyboard-accessible with no extra state. */}
      <Reveal className="mt-12">
      <section>
        <h2 className="text-2xl font-medium sm:text-3xl">{t('faqTitle')}</h2>
        <div className="mt-6 space-y-4">
          {FAQ_ITEMS.map(([q, a]) => (
            <details key={q} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                {t(q)}
                <ChevronDown size={18} className="muted shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="muted mt-2 leading-relaxed">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Final CTA: one line, then back up to the tool. */}
      <Reveal className="mt-12">
      <section>
        <div className="card p-8 text-center">
          <p className="text-lg font-medium">{t('ctaBandLine')}</p>
          <div className="mt-5">
            <a href="#tool" className="btn-primary">{t('startCompressing')}</a>
          </div>
        </div>
      </section>
      </Reveal>
    </div>
  );
}
