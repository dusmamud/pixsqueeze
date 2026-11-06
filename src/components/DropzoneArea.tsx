import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';

export default function DropzoneArea() {
  const { t } = useTranslation();
  const addFiles = useCompressorStore((s) => s.addFiles);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif'] },
    onDrop: (files) => addFiles(files),
  });
  return (
    <div>
      <div {...getRootProps()} className="card cursor-pointer border-dashed p-8 text-center" style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: isDragActive ? 'var(--accent)' : undefined }}>
        <input {...getInputProps()} />
        <UploadCloud className="muted mx-auto mb-3" size={24} />
        <p className="text-lg font-medium">{t('dropTitle')}</p>
        <p className="muted mt-1 text-sm">{t('dropSub')}</p>
        <p className="muted mt-1 text-xs">{t('pasteHint')}</p>
      </div>
    </div>
  );
}
