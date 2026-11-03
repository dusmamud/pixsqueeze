# ImgCompressor — Test Report

Date: 2026-11-03 (build verified on this machine)
App: ImgCompressor, 100% client-side, no backend

## 1. Build & type check — PASS

- `npx tsc -b --force` — PASS, no errors (2 errors found during development
  were fixed: AVIF decode null-check, exifr `ifd0` option removed).
- `npm run build` — PASS (Vite 8.3.5, ~5.9s). WASM codecs are split into
  separate chunks (e.g. `avif_enc`, `webp_enc`, `mozjpeg_enc`, `oxipng`),
  proving lazy per-format loading — the main JS bundle does not contain them.
- `npm install` — PASS, 382 packages. Note: the correct npm scope is
  lowercase `@jsquash/*` (`@jSquash` is rejected by the registry with 404).

## 2. Routes — PASS (all HTTP 200 via `vite preview`)

| Route | Result |
|---|---|
| `/` (Compressor) | 200, H1 "Smaller images. Zero uploads." |
| `/about` | 200, H1 "About ImgCompressor" |
| `/privacy` | 200, H1 "Privacy Policy" |
| `/terms` | 200, H1 "Terms of Use" |
| `/faq` | 200, H1 "Frequently Asked Questions" |
| `/does-not-exist` | 200 (SPA fallback), H1 "404" |

## 3. Screenshots — PASS (12 files, in `screenshots/`)

Headless Chromium (Playwright), full-page screenshots, visually inspected:

| Page | Desktop 1440×1000 | Mobile 390×844 |
|---|---|---|
| Home | `desktop-home.png` | `mobile-home.png` |
| About | `desktop-about.png` | `mobile-about.png` |
| Privacy | `desktop-privacy.png` | `mobile-privacy.png` |
| Terms | `desktop-terms.png` | `mobile-terms.png` |
| FAQ | `desktop-faq.png` | `mobile-faq.png` |
| 404 | `desktop-notfound.png` | `mobile-notfound.png` |

Visual findings:
- Header: full nav on desktop, hamburger menu on mobile, EN/HI switcher and
  theme toggle visible on both. Active nav item is highlighted.
- Footer: 4 columns on desktop, stacked vertically on mobile, no overflow.
- Home: dropzone, format/quality/max-dimension/metadata settings and
  Compress / ZIP / Clear buttons all render correctly on both sizes.
- Theme note: screenshots show the light theme because the headless
  browser prefers light; the app follows `localStorage > system preference`.

## 4. Real compression in a real browser — PASS

Tested with Playwright + headless Chromium, uploading files through the
actual dropzone and clicking "Compress all" (default: WebP, quality 80):

- **Realistic photo-like image:** 1600×1200 noisy PNG, 5.50 MB →
  **1.26 MB WebP, 77% saved, status "Done"**, Download and Crop buttons present.
- **Runtime format detection — PASS:** in headless Chromium the format
  dropdown offered only JPEG / PNG / WebP. AVIF was correctly *hidden*
  because that browser cannot encode AVIF via canvas — no silent fallback.

## 5. Honest limitation found (and fixed in the UI)

- A tiny, already-optimised 10.2 KB PNG re-encoded to WebP at quality 80
  came out at 20.0 KB (larger). This is expected — lossy re-encoding of a
  tiny flat-colour PNG can grow it. The UI previously clamped this to
  "0% saved"; it now shows the truth ("96% larger") so the user is never
  misled. Future improvement: a "never larger" guard that returns the
  original file when re-encoding would not shrink it.

## 6. NOT tested here (needs a manual click in your own browser)

- Crop dialog interaction, ZIP download of multiple files, HEIC upload,
  AVIF output on a browser that supports AVIF encoding, PWA offline install,
  and the Cloudflare Pages workflow (needs your GitHub secrets — see README).
  These are code-complete but were not exercised end-to-end in this run.
