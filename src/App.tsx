import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import { AboutPage, PrivacyPage, TermsPage, FaqPage } from './pages/StaticPage';
import NotFoundPage from './pages/NotFoundPage';
import { DEFAULT_LOCALE, isSupportedLocale } from './lib/locales';

// Prefixed locale branch: /hi, /hi/about, ... The default locale never has
// a prefix, so /en/about redirects to /about. An unknown first segment
// (e.g. /fr/about before French exists) is a 404, not a redirect.
function LocaleEntry() {
  const { locale, '*': rest } = useParams();
  if (locale === DEFAULT_LOCALE) {
    return <Navigate to={`/${rest ?? ''}`} replace />;
  }
  if (!isSupportedLocale(locale)) return <NotFoundPage />;
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="terms" element={<TermsPage />} />
      <Route path="faq" element={<FaqPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Default locale (English) — no prefix. Static paths rank above
            the dynamic :locale route, so /about never lands in LocaleEntry. */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/:locale/*" element={<LocaleEntry />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
