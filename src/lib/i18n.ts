import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

// Compile-time guard: hi must carry exactly the same keys as en, so a
// missing Hindi translation is a build error, not a silent English fallback.
const hiTyped: typeof en = hi;

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

// Detection order (i18next-browser-languagedetector): an explicit ?lng=hi
// link wins, then the user's saved choice, then the browser language, then
// the <html lang> tag. The choice is cached in localStorage under
// 'imgcompressor-lng', so changeLanguage() in the header needs no manual
// localStorage write. load: 'languageOnly' normalises 'hi-IN' to 'hi'.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hiTyped } },
    supportedLngs: ['en', 'hi'],
    fallbackLng: 'en',
    load: 'languageOnly',
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'imgcompressor-lng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes
  });
i18n.on('languageChanged', syncDocument);
syncDocument(i18n.language);
export default i18n;
