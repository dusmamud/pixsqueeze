import { useTranslation } from 'react-i18next';
import { ImageDown, Lock } from 'lucide-react';
import { LocalizedLink } from './LocalizedLink';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}><ImageDown size={17} aria-hidden="true" /></span><span className="font-semibold">{t('brand')}</span></div>
          <p className="muted mt-3 text-sm">{t('footerNote')}</p>
          <p className="muted mt-2 flex items-center gap-1.5 text-xs"><Lock size={12} aria-hidden="true" />{t('privacyBadge')}</p>
        </div>
        <nav aria-label="Product"><p className="mb-3 text-sm font-semibold">{t('footerProduct')}</p><ul className="muted space-y-2 text-sm"><li><LocalizedLink to="/">{t('navHome')}</LocalizedLink></li><li><LocalizedLink to="/about">{t('navAbout')}</LocalizedLink></li><li><LocalizedLink to="/faq">{t('navFaq')}</LocalizedLink></li></ul></nav>
        <nav aria-label="Legal"><p className="mb-3 text-sm font-semibold">{t('footerLegal')}</p><ul className="muted space-y-2 text-sm"><li><LocalizedLink to="/privacy">{t('navPrivacy')}</LocalizedLink></li><li><LocalizedLink to="/terms">{t('navTerms')}</LocalizedLink></li></ul></nav>
        <div><p className="mb-3 text-sm font-semibold">ImgCompressor</p><p className="muted text-sm">{t('heroSub')}</p></div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 pb-6 text-xs sm:flex-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <span className="muted">© {year} {t('brand')}. {t('footerNote')}</span>
        <span className="muted">Vite · React · Tailwind · 100% client-side</span>
      </div>
    </footer>
  );
}
