import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Moon, Sun, ImageDown, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';

// Simple header: logo, three links, language, theme. No CTA, no badge, no clutter.
const LINKS = [
  { to: '/', key: 'navHome' },
  { to: '/about', key: 'navAbout' },
  { to: '/faq', key: 'navFaq' },
] as const;
const ALL_LINKS = [
  ...LINKS,
  { to: '/privacy', key: 'navPrivacy' },
  { to: '/terms', key: 'navTerms' },
] as const;

export default function Header() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useCompressorStore();
  const [open, setOpen] = useState(false);
  const changeLng = (lng: string) => { void i18n.changeLanguage(lng); localStorage.setItem('imgcompressor-lng', lng); };
  return (
    <header className="sticky top-0 z-40" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}><ImageDown size={18} /></span>
          <span className="truncate text-base font-bold">ImgCompressor</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="text-sm font-medium" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : undefined })}>{t(l.key)}</NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="flex text-sm font-medium">
            {(['en', 'hi'] as const).map((lng) => (
              <button key={lng} onClick={() => changeLng(lng)} className="px-1.5 py-1" style={i18n.language === lng ? { color: 'var(--accent)', fontWeight: 700 } : { color: 'var(--muted)' }}>{lng.toUpperCase()}</button>
            ))}
          </div>
          <button aria-label="Toggle theme" className="rounded-lg p-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button aria-label="Menu" className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <nav className="mx-auto grid max-w-7xl gap-1 px-4 pb-3 md:hidden" aria-label="Mobile">
          {ALL_LINKS.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium" style={{ background: 'var(--surface-2)' }}>{t(l.key)}</NavLink>)}
        </nav>
      )}
    </header>
  );
}
