import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, ImageDown, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';
import { LocalizedLink, LocalizedNavLink } from './LocalizedLink';
import { DEFAULT_LOCALE, LOCALES, getLocaleFromPath, localizePath } from '../lib/locales';

const LINKS = [
  { to: '/', key: 'navHome' },
  { to: '/about', key: 'navAbout' },
  { to: '/faq', key: 'navFaq' },
  { to: '/privacy', key: 'navPrivacy' },
  { to: '/terms', key: 'navTerms' },
] as const;

export default function Header() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useCompressorStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Home in the current locale ('/' in English, '/hi/' in Hindi).
  const locale = getLocaleFromPath(location.pathname) ?? DEFAULT_LOCALE;
  const homePath = localizePath('/', locale);
  // Header CTA must actually scroll to the tool: React Router's Link to
  // "/#tool" only changes the hash and never scrolls, on home or from
  // another page. Scroll explicitly after navigating home if needed.
  const goToTool = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const scroll = () => document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (location.pathname !== homePath) { navigate(homePath); window.setTimeout(scroll, 200); } else { scroll(); }
  };
  // Switching language navigates to the same page in the other locale
  // (SPA navigation, so an in-progress compression is not lost). The URL
  // is the single source of truth for the language — this deliberately
  // does NOT call i18n.changeLanguage itself. Calling changeLanguage here
  // AND navigating raced with LocaleSync: the effect could observe the
  // new language against the old URL and "correct" it back, and the stale
  // saved choice then bounced the URL back too, so HI -> EN never worked.
  // The chosen language travels in navigation state instead, and
  // LocaleSync (the only writer) applies it from the URL/state.
  const changeLng = (lng: string) => {
    const params = new URLSearchParams(location.search);
    params.delete('lng');
    const search = params.toString();
    navigate(`${localizePath(location.pathname, lng)}${search ? `?${search}` : ''}${location.hash}`, { state: { lng } });
  };
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'text-white' : 'muted'}`;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>{t('skipToContent')}</a>
      <header className="-mx-4 px-4">
      <div className="mx-auto flex h-16 max-w-7xl flex-nowrap items-center justify-between gap-3">
        <LocalizedLink to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}><ImageDown size={20} aria-hidden="true" /></span>
          <span className="truncate text-base font-semibold">{t('brand')}</span>
        </LocalizedLink>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map((l) => <LocalizedNavLink key={l.to} to={l.to} style={({ isActive }) => (isActive ? { background: 'var(--accent)', color: 'var(--accent-text)' } : undefined)} className={linkCls}>{t(l.key)}</LocalizedNavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <div className="card flex p-1 text-xs font-semibold">
            {LOCALES.map((l) => (
              <button key={l.code} aria-pressed={i18n.language === l.code} aria-label={l.nativeName} onClick={() => changeLng(l.code)} className="rounded-lg px-1.5 py-1 sm:px-2" style={i18n.language === l.code ? { background: 'var(--accent)', color: 'var(--accent-text)' } : undefined}>{l.code.toUpperCase()}</button>
            ))}
          </div>
          <button aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')} className="card p-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
          <a href={`${homePath}#tool`} onClick={goToTool} className="hidden h-9 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition hover:brightness-110 xl:inline-flex" style={{ background: 'var(--accent)', color: 'var(--accent-text)', boxShadow: '0 1px 2px rgba(0,0,0,.3), 0 6px 16px rgba(0,0,0,.25)' }}>{t('startCompressing')}</a>
          <button aria-label="Menu" aria-expanded={open} aria-controls="mobile-nav" className="card p-2 lg:hidden" onClick={() => setOpen(!open)}>{open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}</button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="mx-auto mt-3 grid max-w-7xl gap-1 pb-2 lg:hidden" aria-label="Mobile">
          {LINKS.map((l) => <LocalizedNavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium" style={({ isActive }) => (isActive ? { background: 'var(--surface-2)' } : undefined)}>{t(l.key)}</LocalizedNavLink>)}
        </nav>
      )}
      </header>
    </>
  );
}
