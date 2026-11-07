import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';
import { FORMAT_EXT, type OutputFormat } from '../lib/formats';

export default function SettingsPanel() {
  const { t } = useTranslation();
  const s = useCompressorStore();
  const [unit, setUnit] = useState<'KB' | 'MB'>('KB');
  // Stored as KB; the field shows it in the chosen unit (MB rounded to 2dp).
  const displayTarget = unit === 'KB' ? s.targetSizeKb : Math.round((s.targetSizeKb / 1024) * 100) / 100;
  const pick = (format: OutputFormat, fallback: OutputFormat): OutputFormat =>
    s.supportedFormats.includes(format) ? format : fallback;
  const presets = [
    { key: 'presetWeb', format: pick('webp', 'jpeg'), quality: 80, max: 1920 },
    { key: 'presetSmallest', format: pick('avif', 'webp'), quality: 60, max: 1280 },
    { key: 'presetPhoto', format: 'jpeg' as OutputFormat, quality: 85, max: 0 },
    { key: 'presetLossless', format: 'png' as OutputFormat, quality: 100, max: 0 },
  ];
  const activePreset = presets.find((p) => p.format === s.format && p.quality === s.quality && p.max === s.maxWidthOrHeight);
  return (
    <section className="card p-5">
      <h2 className="text-base font-medium">{t('settings')}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <button key={p.key} aria-pressed={activePreset?.key === p.key} onClick={() => s.setSettings({ format: p.format, quality: p.quality, maxWidthOrHeight: p.max })} className="rounded-[10px] px-3 py-2.5 text-sm font-medium transition" style={activePreset?.key === p.key ? { background: 'var(--accent)', color: 'var(--accent-text)' } : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {t(p.key)}
          </button>
        ))}
      </div>
      <label className="mt-5 block text-sm font-medium">{t('format')}
        <select className="field mt-2" value={s.format} onChange={(e) => s.setSettings({ format: e.target.value as OutputFormat })}>
          {s.supportedFormats.map((f) => <option key={f} value={f}>{f.toUpperCase()} (.{FORMAT_EXT[f]})</option>)}
        </select>
        <span className="muted block pt-1 text-xs">{t('supportedNote')}</span>
      </label>
      <label className="mt-4 block text-sm font-medium">{t('quality')}: {s.quality}%
        <input className="mt-3 w-full" type="range" min={10} max={100} value={s.quality} onChange={(e) => s.setSettings({ quality: Number(e.target.value) })} />
      </label>
      <label className="mt-4 block text-sm font-medium">{t('maxSize')}
        <input className="field mt-2" type="number" min={0} inputMode="numeric" value={s.maxWidthOrHeight} onChange={(e) => s.setSettings({ maxWidthOrHeight: Number(e.target.value) })} />
      </label>
      <label className="mt-4 block text-sm font-medium">{t('targetSize')}
        <span className="mt-2 flex gap-2">
          <input className="field" type="number" min={0} inputMode="decimal" value={displayTarget} onChange={(e) => s.setSettings({ targetSizeKb: Math.max(0, Math.round(Number(e.target.value) * (unit === 'MB' ? 1024 : 1))) })} />
          <select className="field w-24 shrink-0" value={unit} onChange={(e) => setUnit(e.target.value as 'KB' | 'MB')} aria-label={t('targetSizeUnit')}>
            <option value="KB">KB</option>
            <option value="MB">MB</option>
          </select>
        </span>
        <span className="muted block pt-1 text-xs">{t('targetSizeNote')}</span>
      </label>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={s.stripMetadata} onChange={(e) => s.setSettings({ stripMetadata: e.target.checked })} />
        {t('stripMetadata')}
      </label>
    </section>
  );
}
