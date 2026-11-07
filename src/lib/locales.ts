import enJson from '../locales/en.json';
import hiJson from '../locales/hi.json';

/**
 * Single source of truth for locales — the one file you touch to add a language.
 *
 * To add a locale (say French):
 *   1. Add `fr.json` in src/locales (same keys as en.json — the build fails
 *      if a key is missing, see `extraTranslations` below).
 *   2. Import it here and add one entry to `extraTranslations`.
 *   3. Add one entry to LOCALES below.
 * Nothing else changes: URL routing, the language detector, the header
 * switcher, prerendering, hreflang tags and the sitemap all read this file.
 *
 * URL scheme (Google's recommended subdirectory style): the default locale
 * lives at the root with no prefix (`/`, `/about`), every other locale gets
 * its code as the first path segment (`/hi/`, `/hi/about`). The default
 * locale never gets a prefix — `/en/about` redirects to `/about`.
 */
export const DEFAULT_LOCALE = 'en';
export const SITE_URL = 'https://imgcompressor.pages.dev';

export interface LocaleMeta {
  code: string;
  label: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: readonly LocaleMeta[] = [
  { code: 'en', label: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
];

/** Compile-time guard: every non-default locale must carry exactly the same
 * keys as en.json, so a missing translation is a build error, not a silent
 * English fallback at runtime. */
const extraTranslations = { hi: hiJson } satisfies Record<string, typeof enJson>;

export const resources: Record<string, { translation: typeof enJson }> = {
  en: { translation: enJson },
  ...Object.fromEntries(
    Object.entries(extraTranslations).map(([code, json]) => [code, { translation: json }]),
  ),
};

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const PREFIXED_LOCALES = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE);

export function isSupportedLocale(code: string | undefined | null): code is string {
  return typeof code === 'string' && LOCALE_CODES.includes(code);
}

export function getLocaleMeta(code: string): LocaleMeta | undefined {
  return LOCALES.find((l) => l.code === code);
}

/** The locale a URL path carries, or null for the default locale (no prefix).
 * `/hi/about` -> 'hi', `/about` -> null, `/en/about` -> null. */
export function getLocaleFromPath(pathname: string): string | null {
  const first = pathname.split('/').filter(Boolean)[0];
  return first && PREFIXED_LOCALES.some((l) => l.code === first) ? first : null;
}

/** Strip any locale prefix (including the default's) from a pathname:
 * `/hi/about` -> '/about', `/en/` -> '/', `/about` -> '/about'. */
export function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && (isSupportedLocale(parts[0]) || parts[0] === DEFAULT_LOCALE)) {
    parts.shift();
  }
  return `/${parts.join('/')}`;
}

/** The same page in another locale: `/about` in 'hi' -> '/hi/about',
 * `/hi/about` in 'en' -> '/about', `/` in 'hi' -> '/hi/'. */
export function localizePath(pathname: string, code: string): string {
  const clean = stripLocalePrefix(pathname);
  if (code === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${code}/` : `/${code}${clean}`;
}

/** Absolute URL of a page in a locale, for hreflang tags and the sitemap. */
export function localeUrl(pathname: string, code: string): string {
  return `${SITE_URL}${localizePath(pathname, code)}`;
}

/** Content routes ('' = home) — the prerender script and sitemap iterate these. */
export const CONTENT_ROUTES = ['', 'about', 'privacy', 'terms', 'faq'] as const;

/** Locale key for each route's <h1>, used for per-page <title> tags. */
export const ROUTE_TITLE_KEYS: Record<string, string> = {
  about: 'aboutTitle',
  privacy: 'privacyTitle',
  terms: 'termsTitle',
  faq: 'faqTitle',
};
