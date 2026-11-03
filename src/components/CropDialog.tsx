import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { useTranslation } from 'react-i18next';
import type { Job } from '../store/useCompressorStore';
import { useCompressorStore } from '../store/useCompressorStore';

export default function CropDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const { t } = useTranslation();
  const updateJob = useCompressorStore((s) => s.updateJob);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height));
  };

  const apply = async () => {
    const img = imgRef.current;
    if (!img || !completed) return;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(completed.width * scaleX));
    canvas.height = Math.max(1, Math.round(completed.height * scaleY));
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(img, completed.x * scaleX, completed.y * scaleY, completed.width * scaleX, completed.height * scaleY, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png', 1));
    if (!blob) return;
    const file = new File([blob], job.file.name.replace(/\.[^.]+$/, '') + '-cropped.png', { type: 'image/png' });
    updateJob(job.id, { file, previewUrl: URL.createObjectURL(file), status: 'waiting', resultUrl: undefined, resultName: undefined, resultSize: undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card max-h-[90vh] w-full max-w-2xl overflow-auto p-4">
        <ReactCrop crop={crop} onChange={setCrop} onComplete={setCompleted}>
          <img ref={imgRef} src={job.previewUrl} alt={job.file.name} onLoad={onImageLoad} className="max-h-[60vh] w-full object-contain" />
        </ReactCrop>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-primary" disabled={!completed} onClick={() => void apply()}>{t('applyCrop')}</button>
        </div>
      </motion.div>
    </div>
  );
}
