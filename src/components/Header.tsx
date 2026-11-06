import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, ImageDown, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompressorStore } from '../store/useCompressorStore';

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
  // Header CTA must actually scroll to the tool: React Router's Link to
  // "/#tool" only changes the hash and never scrolls, on home or from
  // another page. Scroll explicitly after navigating home if needed.
  const goToTool = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const scroll = () => document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (location.pathname !== '/') { navigate('/'); window.setTimeout(scroll, 200); } else { scroll(); }
  };
  const changeLng = (lng: string) => { void i18n.changeLanguage(lng); localStorage.setItem('imgcompressor-lng', lng); };
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-medium ${isActive ? 'text-white' : 'muted'}`;
  return (
    <header className="sticky top-0 z-40 -mx-4 px-4 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}>
      <div className="mx-auto flex h-16 max-w-7xl flex-nowrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}><ImageDown size={20} /></span>
          <span className="truncate text-base font-extrabold">{t('brand')}</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} style={({ isActive }) => (isActive ? { background: 'var(--accent)', color: 'var(--accent-text)' } : undefined)} className={linkCls}>{t(l.key)}</NavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <div className="card flex p-1 text-xs font-semibold">
            {(['en', 'hi'] as const).map((lng) => (
              <button key={lng} onClick={() => changeLng(lng)} className="rounded-lg px-1.5 py-1 sm:px-2" style={i18n.language === lng ? { background: 'var(--accent)', color: 'var(--accent-text)' } : undefined}>{lng.toUpperCase()}</button>
            ))}
          </div>
          <button aria-label="Toggle theme" className="card p-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <a href="/#tool" onClick={goToTool} className="hidden h-9 items-center justify-center rounded-xl px-4 text-sm font-bold transition hover:brightness-110 xl:inline-flex" style={{ background: 'var(--accent)', color: 'var(--accent-text)', boxShadow: '0 1px 2px rgba(0,0,0,.3), 0 6px 16px rgba(0,0,0,.25)' }}>{t('startCompressing')}</a>
          <button aria-label="Menu" className="card p-2 lg:hidden" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <nav className="mx-auto mt-3 grid max-w-7xl gap-1 pb-2 lg:hidden" aria-label="Mobile">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium" style={({ isActive }) => (isActive ? { background: 'var(--surface-2)' } : undefined)}>{t(l.key)}</NavLink>)}
        </nav>
      )}
    </header>
  );
}
