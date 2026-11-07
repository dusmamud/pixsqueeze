import { useState } from 'react';
import { motion } from 'motion/react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Download, X, Columns2, Crop as CropIcon, RotateCcw, Loader2, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Job } from '../store/useCompressorStore';
import { useCompressorStore } from '../store/useCompressorStore';
import { formatBytes as fb, savedPercent } from '../lib/formats';
import CropDialog from './CropDialog';

export default function ImageCard({ job, onRetry }: { job: Job; onRetry?: (job: Job) => void }) {
  const { t } = useTranslation();
  const removeJob = useCompressorStore((s) => s.removeJob);
  const [showCompare, setShowCompare] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const saved = job.resultSize !== undefined ? savedPercent(job.file.size, job.resultSize) : 0;
  const statusText = job.status === 'processing' ? t('processing') : job.status === 'done' ? (job.targetMet === false ? `${t('targetMissed')} · ${fb(job.resultSize ?? 0)}` : `${t('done')} · ${saved >= 0 ? `${saved}% ${t('saved')}` : `${-saved}% larger`}`) : job.status === 'failed' ? t('failed') : t('waiting');
  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="card overflow-hidden p-3 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-44 w-full shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-44" style={{ background: 'var(--surface-2)' }}>
          <img src={job.resultUrl || job.previewUrl} alt={job.file.name} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={job.file.name}>{job.file.name}</p>
          <p className="mono muted mt-1 text-xs">{t('original')}: {fb(job.file.size)}{job.resultSize !== undefined ? ` → ${t('compressed')}: ${fb(job.resultSize)}` : ''}</p>
          <p className="mt-1.5 text-xs font-medium" aria-live="polite">{statusText}</p>
          {job.status === 'failed' && (
            <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium" style={{ color: 'var(--danger)' }}>
              <TriangleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
              <span>{t(job.errorKey ?? 'errGeneric')}</span>
            </p>
          )}
          {job.exifNote && <p className="muted mt-1 text-xs">EXIF: {job.exifNote}</p>}
          {job.status === 'processing' && <span className="mt-2 flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16} aria-hidden="true" />{t('processing')}</span>}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
          {job.resultUrl && job.resultName && <a className="btn-primary text-sm" href={job.resultUrl} download={job.resultName}><Download size={15} className="mr-1 inline" aria-hidden="true" />{t('download')}</a>}
          <div className="flex gap-2">
            <button className="btn-ghost !min-h-0 !px-3 !py-2 text-sm" onClick={() => setShowCrop(true)}><CropIcon size={15} className="mr-1 inline" aria-hidden="true" />{t('crop')}</button>
            {job.resultUrl && <button className="btn-ghost !min-h-0 !px-3 !py-2 text-sm" aria-pressed={showCompare} onClick={() => setShowCompare(!showCompare)}><Columns2 size={15} className="mr-1 inline" aria-hidden="true" />{t('compare')}</button>}
            {job.status === 'failed' && onRetry && <button className="btn-primary !min-h-0 !px-3 !py-2 text-sm" onClick={() => onRetry(job)}><RotateCcw size={15} className="mr-1 inline" aria-hidden="true" />{t('retry')}</button>}
            <button aria-label={t('remove')} className="btn-ghost !min-h-0 !px-3 !py-2" onClick={() => removeJob(job.id)}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      {showCrop && <CropDialog job={job} onClose={() => setShowCrop(false)} />}
      {showCompare && job.resultUrl && (
        <div className="mt-4 overflow-hidden rounded-lg">
          <ReactCompareSlider itemOne={<ReactCompareSliderImage src={job.previewUrl} alt={t('demoOriginal')} />} itemTwo={<ReactCompareSliderImage src={job.resultUrl} alt={t('demoCompressed')} />} />
        </div>
      )}
    </motion.article>
  );
}
