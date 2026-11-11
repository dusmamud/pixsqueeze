// Build-time prerendering: after `vite build`, render every locale x route
// to a static HTML file, so crawlers and first paint get real content in the
// right language — no browser needed (pure Node, so it also runs in CI).
//
// File layout (flat .html, NOT route/index.html): Cloudflare Pages treats
// `about.html` as canonical `/about`, while `about/index.html` would be
// canonical `/about/` (with a trailing slash). Home stays `index.html`
// (`/`) and `hi/index.html` (`/hi/`).
//
// Each file is the Vite shell (same JS/CSS assets) with the React output
// injected into #root, plus per-locale <html lang>, <title>, meta
// description, canonical, hreflang (self + every other locale + x-default)
// and Open Graph tags. On load, React takes over the static markup
// (createRoot re-renders; the content is identical, so there is no flash).
// The script also writes sitemap.xml and fails the build on a missing
// translation instead of shipping an English fallback.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';

// ---------- Minimal browser stubs ----------
// Imported app code touches document/localStorage at module scope; rendering
// itself never needs a real DOM, so these no-op stubs are enough. They must
// be installed BEFORE any app module is imported (dynamic imports below).
const makeElement = () => ({
  style: {},
  getContext: () => null,
  setAttribute: (_n: string, _v: string) => {},
  getAttribute: (_n: string) => null,
  addEventListener: (_t: string, _h: unknown) => {},
  removeEventListener: (_t: string, _h: unknown) => {},
  appendChild: (_c: unknown) => {},
  removeChild: (_c: unknown) => {},
});
const documentElement = {
  ...makeElement(),
  getAttribute: (name: string) => (name === 'data-theme' ? 'dark' : name === 'lang' ? 'en' : null),
};
(globalThis as Record<string, unknown>).document = {
  documentElement,
  querySelector: () => null,
  title: '',
  cookie: '',
  createElement: () => makeElement(),
  addEventListener: (_t: string, _h: unknown) => {},
  removeEventListener: (_t: string, _h: unknown) => {},
};
// motion's projection node attaches a resize listener during render; none of
// these ever fire in a synchronous server render, they just need to exist.
(globalThis as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 16);
(globalThis as Record<string, unknown>).cancelAnimationFrame = (id: unknown) =>
  clearTimeout(id as NodeJS.Timeout);
(globalThis as Record<string, unknown>).addEventListener = (_t: string, _h: unknown) => {};
(globalThis as Record<string, unknown>).removeEventListener = (_t: string, _h: unknown) => {};
(globalThis as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
// Node 21+ ships a getter-only global `navigator`, so plain assignment
// throws — define it instead. exifr reads navigator.userAgent at import
// time, so the stub needs one.
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'en-US', languages: ['en-US'], userAgent: 'Node.js' },
  configurable: true,
});
(globalThis as Record<string, unknown>).window = globalThis;
(globalThis as Record<string, unknown>).location = {
  pathname: '/',
  search: '',
  hash: '',
  href: 'https://imgcompressor.pages.dev/',
};

const { default: App } = await import('../src/App.tsx');
const { default: i18n } = await import('../src/lib/i18n.ts');
const {
  CONTENT_ROUTES,
  DEFAULT_LOCALE,
  LOCALES,
  ROUTE_TITLE_KEYS,
  SITE_URL,
  localizePath,
  resources,
} = await import('../src/lib/locales.ts');

// ---------- Validation: fail the build on a missing/extra key ----------
const enKeys = Object.keys(resources.en.translation);
for (const { code } of LOCALES) {
  const keys = Object.keys(resources[code].translation);
  const missing = enKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !enKeys.includes(k));
  if (missing.length > 0) {
    throw new Error(`[prerender] ${code}.json is missing keys: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    throw new Error(`[prerender] ${code}.json has extra keys not in en.json: ${extra.join(', ')}`);
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shell = readFileSync(join(dist, 'index.html'), 'utf8');
const requireAnchor = (pattern: RegExp, label: string) => {
  if (!pattern.test(shell)) {
    throw new Error(`[prerender] dist/index.html is missing ${label} — cannot inject into it`);
  }
};
requireAnchor(/<html lang="en"/, '<html lang="en"');
requireAnchor(/<title>.*?<\/title>/, '<title>');
requireAnchor(/<meta name="description"[^>]*>/, 'meta description');
requireAnchor(/<div id="root"><\/div>/, '<div id="root"></div>');
requireAnchor(/<\/head>/, '</head>');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ogLocale = (code: string) =>
  code === 'en' ? 'en_US' : code === 'hi' ? 'hi_IN' : `${code}_${code.toUpperCase()}`;

const written: string[] = [];
for (const meta of LOCALES) {
  const code = meta.code;
  await i18n.changeLanguage(code);
  const t = i18n.t.bind(i18n);
  for (const route of CONTENT_ROUTES) {
    const urlPath = code === DEFAULT_LOCALE ? `/${route}` : route ? `/${code}/${route}` : `/${code}/`;
    const body = renderToString(
      React.createElement(StaticRouter, { location: urlPath }, React.createElement(App)),
    );
    if (!body.includes('<h1')) {
      throw new Error(`[prerender] ${urlPath} rendered without an <h1> — refusing to write it`);
    }
    const pageTitle =
      route === ''
        ? t('metaTitle')
        : (() => {
            const h1 = t(ROUTE_TITLE_KEYS[route]);
            return h1.includes('ImgCompressor') ? h1 : `${h1} — ImgCompressor`;
          })();
    const desc = t('metaDescription');
    const abs = `${SITE_URL}${urlPath}`;
    const headExtras = [
      `<link rel="canonical" href="${esc(abs)}" />`,
      ...LOCALES.map(
        (l) =>
          `<link rel="alternate" hreflang="${l.code}" href="${esc(`${SITE_URL}${localizePath(urlPath, l.code)}`)}" />`,
      ),
      `<link rel="alternate" hreflang="x-default" href="${esc(`${SITE_URL}${localizePath(urlPath, DEFAULT_LOCALE)}`)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:url" content="${esc(abs)}" />`,
      `<meta property="og:title" content="${esc(pageTitle)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:locale" content="${ogLocale(code)}" />`,
      ...LOCALES.filter((l) => l.code !== code).map(
        (l) => `<meta property="og:locale:alternate" content="${ogLocale(l.code)}" />`,
      ),
      `<meta property="og:image" content="${SITE_URL}/sample.png" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="800" />`,
      `<meta property="og:image:alt" content="${esc(t('ogImageAlt'))}" />`,
      // Structured data for the tool itself, home only — this is the page
      // search engines should treat as the application.
      ...(route === ''
        ? [
            `<script type="application/ld+json">${JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'ImgCompressor',
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web browser',
              url: SITE_URL,
              description: desc,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', category: 'free' },
            })}</script>`,
          ]
        : []),
    ].join('\n    ');
    const page = shell
      .replace(/<html lang="en"([^>]*)>/, `<html lang="${code}" dir="${meta.dir}"$1>`)
      .replace(/<title>.*?<\/title>/, `<title>${esc(pageTitle)}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"[^>]*>/,
        `<meta name="description" content="${esc(desc)}" />`,
      )
      .replace('</head>', `    ${headExtras}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const outPath =
      code === DEFAULT_LOCALE
        ? route === ''
          ? join(dist, 'index.html')
          : join(dist, `${route}.html`)
        : route === ''
          ? join(dist, code, 'index.html')
          : join(dist, code, `${route}.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, page);
    written.push(outPath);
  }
}

// ---------- sitemap.xml (one <url> per locale x route, with hreflang) ----------
const sitemapUrls: string[] = [];
for (const route of CONTENT_ROUTES) {
  const enPath = route === '' ? '/' : `/${route}`;
  const alternates =
    LOCALES.map(
      (l) =>
        `<xhtml:link rel="alternate" hreflang="${l.code}" href="${esc(`${SITE_URL}${localizePath(enPath, l.code)}`)}" />`,
    ).join('') +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(`${SITE_URL}${enPath}`)}" />`;
  for (const l of LOCALES) {
    sitemapUrls.push(
      `  <url><loc>${esc(`${SITE_URL}${localizePath(enPath, l.code)}`)}</loc>${alternates}</url>`,
    );
  }
}
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapUrls.join('\n')}\n</urlset>\n`,
);

console.log(`[prerender] wrote ${written.length} pages + sitemap.xml`);
for (const f of written) console.log(`  ${f.replace(dist, 'dist')}`);
