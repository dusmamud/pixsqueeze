import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, TriangleAlert, X, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';
import { MAX_BATCH_BYTES, MAX_FILE_BYTES, MAX_FILES_PER_BATCH, limitLabel, limitRejectionMessage } from '../lib/limits';

export default function DropzoneArea() {
  const { t } = useTranslation();
  const addFiles = useCompressorStore((s) => s.addFiles);
  const [rejected, setRejected] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif'] },
    // addFiles enforces the batch limits and reports what they rejected —
    // a file the limits stop must say why, not just never appear.
    onDrop: (files) => {
      const res = addFiles(files);
      setRejected(res.rejected.length ? limitRejectionMessage(t, res.rejected) : null);
    },
    // Without this, dropping a non-image file fails silently — the file
    // just never appears and the user has no idea why.
    onDropRejected: (rejections) => {
      const names = rejections.map((r) => r.file.name);
      setRejected(t('errNotImage', { count: names.length, name: names[0] }));
    },
  });
  return (
    <div>
      <div {...getRootProps({ role: 'button', 'aria-label': t('dropTitle') })} className="card cursor-pointer border-dashed p-8 text-center" style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: isDragActive ? 'var(--accent)' : undefined }}>
        <input {...getInputProps()} />
        <UploadCloud className="muted mx-auto mb-3" size={24} aria-hidden="true" />
        <p className="text-lg font-medium">{t('dropTitle')}</p>
        <p className="muted mt-1 text-sm">{t('dropSub')}</p>
        <p className="muted mt-1 text-xs">{t('pasteHint')}</p>
        {/* Trust line at the decision point: the footer says the same thing,
            but this is where the user decides whether to hand over a file. */}
        <p className="muted mt-3 flex items-center justify-center gap-1.5 text-xs"><Lock size={12} aria-hidden="true" />{t('dropPrivacy')}</p>
        <p className="muted mt-1 text-xs">{t('dropLimits', { maxFiles: MAX_FILES_PER_BATCH, maxFile: limitLabel(MAX_FILE_BYTES), maxBatch: limitLabel(MAX_BATCH_BYTES) })}</p>
      </div>
      {rejected && (
        <div role="alert" className="alert mt-3">
          <TriangleAlert size={16} className="mt-px shrink-0" style={{ color: 'var(--danger)' }} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">{rejected}</p>
          <button aria-label={t('dismiss')} className="shrink-0 rounded-lg p-1" onClick={() => setRejected(null)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
