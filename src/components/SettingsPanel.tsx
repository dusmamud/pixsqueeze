import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';
import { type OutputFormat } from '../lib/formats';

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
  // Quality slider fill: WebKit paints the track from the input's own
  // background, so the filled share is set inline from the value.
  const qualityFill = ((s.quality - 10) / (100 - 10)) * 100;
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
      {/* Format has only 3-4 options, so a segmented control beats a
          dropdown: every option stays visible, one tap to switch. */}
      <div className="mt-4">
        <span className="block text-sm font-medium" id="format-label">{t('format')}</span>
        <div className="seg mt-2" role="group" aria-labelledby="format-label">
          {s.supportedFormats.map((f) => (
            <button key={f} aria-pressed={s.format === f} onClick={() => s.setSettings({ format: f })}>{f.toUpperCase()}</button>
          ))}
        </div>
        <span className="muted block pt-1 text-xs">{t('supportedNote')}</span>
      </div>
      <label className="mt-4 block text-sm font-medium">{t('quality')}: {s.quality}%
        <input className="slider mt-3" type="range" min={10} max={100} value={s.quality} aria-valuetext={`${s.quality}%`} onChange={(e) => s.setSettings({ quality: Number(e.target.value) })} style={{ background: `linear-gradient(to right, var(--accent) ${qualityFill}%, var(--surface-2) ${qualityFill}%)` }} />
      </label>
      <label className="mt-4 block text-sm font-medium">{t('maxSize')}
        <input className="field mt-2" type="number" min={0} inputMode="numeric" value={s.maxWidthOrHeight} onChange={(e) => s.setSettings({ maxWidthOrHeight: Number(e.target.value) })} />
      </label>
      <div className="mt-4">
        <span className="block text-sm font-medium" id="target-label">{t('targetSize')}</span>
        <span className="mt-2 flex gap-2">
          <input className="field" type="number" min={0} inputMode="decimal" aria-labelledby="target-label" value={displayTarget} onChange={(e) => s.setSettings({ targetSizeKb: Math.max(0, Math.round(Number(e.target.value) * (unit === 'MB' ? 1024 : 1))) })} />
          <span className="seg w-24 shrink-0" role="group" aria-label={t('targetSizeUnit')}>
            {(['KB', 'MB'] as const).map((u) => (
              <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>{u}</button>
            ))}
          </span>
        </span>
        <span className="muted block pt-1 text-xs">{t('targetSizeNote')}</span>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={s.stripMetadata} onChange={(e) => s.setSettings({ stripMetadata: e.target.checked })} />
        {t('stripMetadata')}
      </label>
    </section>
  );
}
