import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DropzoneArea from '../components/DropzoneArea';
import SettingsPanel from '../components/SettingsPanel';
import ImageCard from '../components/ImageCard';
import { useCompressorStore } from '../store/useCompressorStore';
import { detectSupportedFormats, FORMAT_EXT } from '../lib/formats';
import { compressImage } from '../lib/compress';
import { readExifSummary } from '../lib/metadata';
import { downloadAsZip } from '../lib/download';
import { outputName as outName } from '../lib/utils';

export default function HomePage() {
  const { t } = useTranslation();
  const s = useCompressorStore();
  useEffect(() => { void detectSupportedFormats().then((f) => s.setSupportedFormats(f)); }, []);
  const compressAll = async () => {
    for (const job of s.jobs.filter((j) => j.status !== 'done')) {
      s.updateJob(job.id, { status: 'processing' });
      try {
        const exifNote = await readExifSummary(job.file);
        const blob = await compressImage(job.file, { format: s.format, quality: s.quality, maxWidthOrHeight: s.maxWidthOrHeight, stripMetadata: s.stripMetadata });
        s.updateJob(job.id, { status: 'done', resultUrl: URL.createObjectURL(blob), resultName: outName(job.file.name, FORMAT_EXT[s.format]), resultSize: blob.size, exifNote });
      } catch (e) {
        s.updateJob(job.id, { status: 'failed', error: e instanceof Error ? e.message : 'Failed' });
      }
    }
  };
  const downloadAllZip = async () => {
    const done = s.jobs.filter((j) => j.resultUrl && j.resultName);
    const files = await Promise.all(done.map(async (j) => ({ name: j.resultName!, blob: await fetch(j.resultUrl!).then((r) => r.blob()) })));
    if (files.length) void downloadAsZip(files, 'imgcompressor-compressed.zip');
  };
  return (
    <div>
      <section className="py-8 text-center sm:py-10">
        <h1 className="text-3xl font-extrabold sm:text-5xl">{t('heroTitle')}</h1>
        <p className="muted mx-auto mt-3 max-w-2xl text-sm sm:text-base">{t('heroSub')}</p>
      </section>
      <div className="space-y-4">
        <DropzoneArea />
        <SettingsPanel />
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!s.jobs.length} onClick={() => void compressAll()}>{t('compressAll')}</button>
          <button className="btn-ghost" disabled={!s.jobs.some((j) => j.status === 'done')} onClick={() => void downloadAllZip()}>{t('downloadAll')}</button>
          <button className="btn-ghost" onClick={s.clearAll}>{t('clearAll')}</button>
        </div>
        {s.jobs.length === 0 ? <p className="muted py-10 text-center">{t('noImages')}</p> : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.jobs.map((job) => <ImageCard key={job.id} job={job} />)}
          </section>
        )}
      </div>
    </div>
  );
}
