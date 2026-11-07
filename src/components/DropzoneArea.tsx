import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';

export default function DropzoneArea() {
  const { t } = useTranslation();
  const addFiles = useCompressorStore((s) => s.addFiles);
  const [rejected, setRejected] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif'] },
    onDrop: (files) => { setRejected(null); addFiles(files); },
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
