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

## 7. UX / flow update (2026-11-03, Exa-verified)

- Stepper added: Upload → Adjust → Compress → Download, with number + label
  (not colour alone) and an animated active indicator.
- "How it works" section, clipboard-paste upload (Ctrl+V/Cmd+V), and a
  "Try a sample image" button (`public/sample.png`) so the flow can be
  tried with zero files.
- Batch progress bar with aria-live "Compressing X of Y…", per-file
  processing spinner, per-file Retry on failure (no dead end), and an
  "All done!" summary banner with total original/compressed size and
  a Download-all-as-ZIP action.
- Animations via Motion 14.9.0 (`motion/react`, `MotionConfig
  reducedMotion="user"`): hero/card entrance, staggered How-it-works
  cards, dropzone scale on drag, dialog entrance, card layout/exit.
  CSS focus-visible rings, 44px minimum touch targets, and a
  `prefers-reduced-motion` rule that kills CSS motion.
- Verified: `tsc` PASS, `npm run build` PASS, 12 screenshots retaken,
  and a Playwright flow test (sample → Compress all → "All done!" banner
  → ZIP button) PASS.

## 8. Professional redesign (2026-11-03, after user feedback "not professional / not responsive")

- Root cause found by measurement, not guesswork: horizontal overflow was
  102px on mobile (390px) and 144px on tablet (768px), 0px on desktop.
  Cause: custom unlayered CSS (`display: inline-flex` on `.btn-primary`)
  was beating Tailwind's `hidden` utility, so the header CTA stayed
  visible on mobile and the header overflowed. Fix: component classes
  moved into Tailwind's `@layer components`, the stray unlayered
  `display` rule removed, nav/CTA breakpoints moved to `lg`, header
  made wrapping. After the fix: overflow = 0px at 390 / 768 / 1440.
- Design system: dark-first theme (light toggle kept), Space Grotesk
  headings + Inter body, gradient primary buttons, card shadows, wider
  7xl shell, hero glow.
- Layout: hero is now text + a real before/after compare demo
  (190 KB → 82 KB WebP, 57% saved); the tool is a 2-pane app on desktop
  (sticky settings sidebar + queue) and stacked on mobile/tablet.
- Flow: settings presets (Web / Smallest / Photo / Lossless), sticky
  batch bar, job rows (thumbnail + sizes + status + actions) instead of
  large grid cards, and a 6-card Features section.
- Verified: `tsc` PASS, `npm run build` PASS, responsive screenshots at
  390/768/1440 with 0px overflow, flow test (sample → compress → done) PASS.

## 9. Clean redesign (2026-11-03, after user feedback: no neon/futuristic/glow, tool must be in hero, header was cluttered)

- Removed: dark neon theme, green/cyan gradient buttons, hero glow,
  Space Grotesk, before/after showcase slider, Features grid, 2-pane
  sidebar layout, header CTA and badge.
- Now: light clean default (solid blue #2563eb, Inter only, flat
  cards, grey borders), simple header (logo + Compressor/About/FAQ +
  EN/HI + theme, no CTA), and the tool lives directly under the
  headline in one card: dropzone + presets + settings + queue.
- Verified: `tsc` PASS, `npm run build` PASS, flow test (sample →
  compress → All done) PASS, overflow 0px at 390 / 768 / 1440.
