import { useState } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Download, X, Columns2, Crop as CropIcon } from 'lucide-react';
import CropDialog from './CropDialog';
import { useTranslation } from 'react-i18next';
import type { Job } from '../store/useCompressorStore';
import { useCompressorStore } from '../store/useCompressorStore';
import { formatBytes as fb, savedPercent } from '../lib/formats';

export default function ImageCard({ job }: { job: Job }) {
  const { t } = useTranslation();
  const removeJob = useCompressorStore((s) => s.removeJob);
  const [showCompare, setShowCompare] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const saved = job.resultSize !== undefined ? savedPercent(job.file.size, job.resultSize) : 0;
  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <img src={job.resultUrl || job.previewUrl} alt={job.file.name} className="h-full w-full object-contain" />
        <span className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {job.status === 'processing' ? t('processing') : job.status === 'done' ? `✓ ${t('done')} · ${saved >= 0 ? `${saved}% ${t('saved')}` : `${-saved}% larger`}` : job.status === 'failed' ? t('failed') : t('waiting')}
        </span>
        <button aria-label={t('remove')} className="absolute right-2 top-2 rounded-full p-1.5" style={{ background: 'var(--surface)' }} onClick={() => removeJob(job.id)}><X size={16} /></button>
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-semibold" title={job.file.name}>{job.file.name}</p>
        <p className="muted text-xs">{t('original')}: {fb(job.file.size)}{job.resultSize !== undefined ? ` → ${t('compressed')}: ${fb(job.resultSize)}` : ''}</p>
        {job.exifNote && <p className="muted mt-1 text-xs">EXIF: {job.exifNote} {job.status === 'done' ? '· stripped on re-encode' : ''}</p>}
        <div className="mt-3 flex gap-2">
          {job.resultUrl && job.resultName && (
            <a className="btn-primary flex-1 text-center text-sm" href={job.resultUrl} download={job.resultName}><Download size={15} className="mr-1 inline" />{t('download')}</a>
          )}
          <button className="btn-ghost text-sm" onClick={() => setShowCrop(true)}><CropIcon size={15} className="mr-1 inline" />{t('crop')}</button>
          {job.resultUrl && (
            <button className="btn-ghost text-sm" onClick={() => setShowCompare(!showCompare)}><Columns2 size={15} className="mr-1 inline" />{t('compare')}</button>
          )}
        </div>
      </div>
      {showCrop && <CropDialog job={job} onClose={() => setShowCrop(false)} />}
      {showCompare && job.resultUrl && (
        <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <ReactCompareSlider
            itemOne={<ReactCompareSliderImage src={job.previewUrl} alt="Original" />}
            itemTwo={<ReactCompareSliderImage src={job.resultUrl} alt="Compressed" />}
          />
        </div>
      )}
    </article>
  );
}
