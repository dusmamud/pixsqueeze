import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, getLocaleFromPath, isSupportedLocale, localizePath } from '../lib/locales';

// Keeps the URL and the i18n language in sync, both ways:
// - `/hi/...` sets the language to Hindi; an unprefixed URL sets English.
// - `?lng=hi` on an unprefixed URL redirects to the `/hi/...` URL (the param
//   is a share-link override, not the canonical address).
// - A saved non-default choice redirects an unprefixed URL to its locale,
//   so a returning Hindi user lands on `/hi/...`.
// - A switcher navigation carries the chosen language in location state
//   ({ lng }), so an unprefixed URL reached by switching to English is
//   NOT bounced back by the saved-choice rule above: the user just chose
//   English, and the stale saved 'hi' must not override that choice.
//   This component is the ONLY place that calls changeLanguage, so the
//   language can never fight the URL mid-switch (the old dual-writer
//   setup — Header calling changeLanguage AND navigating — made HI -> EN
//   silently revert: the effect saw the new language against the old URL,
//   "corrected" it back to Hindi, and the saved redirect bounced the URL).
// Deliberately no browser-language redirect: Google's guidance is one URL
// per language and no auto-redirect on Accept-Language — its crawler would
// only ever see the default language. Renders nothing.
export default function LocaleSync() {
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  // Language the header switcher just chose, if this entry came from it.
  const intended = typeof (state as { lng?: unknown } | null)?.lng === 'string' && isSupportedLocale((state as { lng: string }).lng)
    ? (state as { lng: string }).lng
    : null;

  useEffect(() => {
    const pathLocale = getLocaleFromPath(pathname);
    if (pathLocale) {
      if (i18n.language !== pathLocale) void i18n.changeLanguage(pathLocale);
      return;
    }
    const params = new URLSearchParams(search);
    const q = params.get('lng');
    if (q && q !== DEFAULT_LOCALE && isSupportedLocale(q)) {
      params.delete('lng');
      const rest = params.toString();
      navigate(`${localizePath(pathname, q)}${rest ? `?${rest}` : ''}${hash}`, { replace: true });
      return;
    }
    if (q) {
      // 'en' or an unknown code: drop the param, stay on the unprefixed URL.
      params.delete('lng');
      const rest = params.toString();
      navigate(`${pathname}${rest ? `?${rest}` : ''}${hash}`, { replace: true });
      return;
    }
    if (intended) {
      // Came from the switcher: the URL already is the target, so just
      // apply the language — never let the saved choice redirect away.
      if (i18n.language !== intended) void i18n.changeLanguage(intended);
      return;
    }
    const saved = localStorage.getItem('imgcompressor-lng');
    if (saved && saved !== DEFAULT_LOCALE && isSupportedLocale(saved)) {
      navigate(`${localizePath(pathname, saved)}${search}${hash}`, { replace: true });
      return;
    }
    if (i18n.language !== DEFAULT_LOCALE) void i18n.changeLanguage(DEFAULT_LOCALE);
  }, [pathname, search, hash, state, intended, navigate, i18n]);

  return null;
}
