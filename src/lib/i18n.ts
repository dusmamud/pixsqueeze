import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALE_CODES, resources } from './locales';

// Keep <html lang>, the document title and the meta description in sync with
// the active language (i18next maintainer's recommended pattern, and a W3C
// requirement: a screen reader pronounces the page in the lang it is told).
// Runs once at startup and on every language change.
function syncDocument(lng: string) {
  // resolvedLanguage is the language actually in use after fallback
  // resolution ('hi', not the raw detected 'hi-IN').
  document.documentElement.setAttribute('lang', i18n.resolvedLanguage ?? lng.split('-')[0]);
  document.title = i18n.t('metaTitle');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', i18n.t('metaDescription'));
}

// Detection order (i18next-browser-languagedetector). The URL path is the
// source of truth — one URL per language, as Google recommends. ?lng= is a
// share-link override, localStorage is the user's saved choice, htmlTag is
// the last resort. There is deliberately NO browser-language (navigator)
// detection here: Google's guidance is not to auto-redirect on
// Accept-Language, because its crawler would only ever see the default
// language. The choice is cached in localStorage under 'imgcompressor-lng'.
// load: 'languageOnly' normalises 'hi-IN' to 'hi'.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: LOCALE_CODES,
    fallbackLng: DEFAULT_LOCALE,
    load: 'languageOnly',
    detection: {
      order: ['path', 'querystring', 'localStorage', 'htmlTag'],
      lookupFromPathIndex: 0,
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'imgcompressor-lng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes
  });
i18n.on('languageChanged', syncDocument);
syncDocument(i18n.language);
export default i18n;
