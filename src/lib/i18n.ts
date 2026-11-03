import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

// English is the default locale. Hindi is the second locale.
// Add a new locale by adding its JSON here + one entry in LanguageSwitcher.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: localStorage.getItem('imgcompressor-lng') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
