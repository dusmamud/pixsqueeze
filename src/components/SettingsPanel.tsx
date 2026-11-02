import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';
import { FORMAT_EXT, type OutputFormat } from '../lib/formats';

export default function SettingsPanel() {
  const { t } = useTranslation();
  const s = useCompressorStore();
  return (
    <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block text-sm font-medium">{t('format')}
        <select className="field mt-2" value={s.format} onChange={(e) => s.setSettings({ format: e.target.value as OutputFormat })}>
          {s.supportedFormats.map((f) => <option key={f} value={f}>{f.toUpperCase()} (.{FORMAT_EXT[f]})</option>)}
        </select>
        <span className="muted block pt-1 text-xs">{t('supportedNote')}</span>
      </label>
      <label className="block text-sm font-medium">{t('quality')}: {s.quality}%
        <input className="mt-3 w-full" type="range" min={10} max={100} value={s.quality} onChange={(e) => s.setSettings({ quality: Number(e.target.value) })} />
      </label>
      <label className="block text-sm font-medium">{t('maxSize')}
        <input className="field mt-2" type="number" min={0} value={s.maxWidthOrHeight} onChange={(e) => s.setSettings({ maxWidthOrHeight: Number(e.target.value) })} />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={s.stripMetadata} onChange={(e) => s.setSettings({ stripMetadata: e.target.checked })} />
        {t('stripMetadata')}
      </label>
    </section>
  );
}
