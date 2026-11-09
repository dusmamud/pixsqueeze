import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';
import { type OutputFormat } from '../lib/formats';

// Number fields keep a string draft: the store holds a number, and
// Number('') is 0, so a directly controlled type="number" input can never
// be cleared — deleting "0" snaps it straight back (measured: value stayed
// "0", typing then produced "070"; in MB mode typing "0.5" became 5 MB).
// The draft holds exactly what the user typed ("" included); a parseable
// value commits to the store live, blur restores the canonical value.
// type="text" + inputMode keeps the right mobile keyboard without the
// number-input quirks ("0." and "e" read as empty).
function NumberField({ value, onCommit, inputMode, decimal, className, ariaLabelledby }: {
  value: number;
  onCommit: (n: number) => void;
  inputMode: 'numeric' | 'decimal';
  decimal: boolean;
  className: string;
  ariaLabelledby?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  // Re-sync when the store value changes from elsewhere (preset, unit
  // switch) — but never while the user is mid-typing: "" and "0." both mean
  // the current store value, so they are left alone.
  useEffect(() => {
    setDraft((d) => {
      const draftValue = d === '' || d === '.' ? 0 : Number(d);
      return draftValue !== value ? String(value) : d;
    });
  }, [value]);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let cleaned: string;
    if (decimal) {
      const parts = raw.replace(/[^0-9.]/g, '').split('.');
      cleaned = parts[0] + (parts.length > 1 ? `.${parts.slice(1).join('')}` : '');
    } else {
      cleaned = raw.replace(/[^0-9]/g, '');
    }
    setDraft(cleaned);
    if (cleaned === '' || cleaned === '.') { onCommit(0); return; }
    const n = Number(cleaned);
    if (Number.isFinite(n)) onCommit(Math.max(0, decimal ? n : Math.round(n)));
  };
  return (
    <input
      className={className}
      type="text"
      inputMode={inputMode}
      pattern={decimal ? '[0-9]*[.]?[0-9]*' : '[0-9]*'}
      aria-labelledby={ariaLabelledby}
      value={draft}
      onChange={handleChange}
      onBlur={() => setDraft(String(value))}
    />
  );
}

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
        <NumberField className="field mt-2" value={s.maxWidthOrHeight} onCommit={(n) => s.setSettings({ maxWidthOrHeight: n })} inputMode="numeric" decimal={false} />
      </label>
      <div className="mt-4">
        <span className="block text-sm font-medium" id="target-label">{t('targetSize')}</span>
        <span className="mt-2 flex gap-2">
          <NumberField className="field" value={displayTarget} onCommit={(n) => s.setSettings({ targetSizeKb: Math.max(0, Math.round(n * (unit === 'MB' ? 1024 : 1))) })} inputMode="decimal" decimal ariaLabelledby="target-label" />
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
