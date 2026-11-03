# ImgCompressor — Client-Side Image Compressor

> Site name: ImgCompressor (formerly PixSqueeze, the placeholder name).

100% browser image compression. No backend, no uploads, no account.
Images are decoded, resized and re-encoded on the user's device.

## Stack

- **Vite + React + TypeScript + Tailwind CSS v4** — static build, no SSR needed
- **Compression:** Canvas / `createImageBitmap` fast path + **jSquash WASM codecs**
  (`@jsquash/jpeg` MozJPEG, `@jsquash/webp`, `@jsquash/avif`, `@jsquash/oxipng`)
  — lazy-imported per output format, never all at once
- **State:** Zustand · **Dropzone:** react-dropzone · **Crop UI:** react-image-crop
- **Compare:** react-compare-slider · **Icons:** lucide-react
- **Batch ZIP:** fflate (lighter than jszip) · **Metadata:** exifr (read-only, re-encoding strips EXIF/GPS)
- **i18n:** i18next + react-i18next — `en` (default) + `hi`, add a locale in `src/locales/`
- **PWA:** vite-plugin-pwa — offline + installable
- **HEIC:** heic-to, lazy-loaded only when a HEIC file actually arrives

## Format support — runtime detection

Not every browser can encode WebP/AVIF. On load, a 2×2 canvas is run
through `toBlob` for each format (`src/lib/formats.ts`) and only formats
that really encode are offered. No silent fallback to another format.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static output in dist/
npm run preview
```

## Deploy — GitHub Actions → Cloudflare Pages

The workflow is already in `.github/workflows/deploy-cloudflare-pages.yml`.
It builds on push to `main` and deploys `dist/` with Wrangler.

1. Create a Cloudflare Pages project (or let the first deploy create it —
   set the project name in the workflow, currently `imgcompressor`).
2. In GitHub: repo → Settings → Secrets and variables → Actions, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push to `main`. The site is static — there is nothing server-side to configure.

## Project structure

```
src/
  main.tsx  App.tsx  index.css
  components/  Header, DropzoneArea, SettingsPanel, ImageCard
  lib/         formats (runtime detection), compress (lazy jSquash),
               metadata (exifr), download (fflate ZIP), i18n, utils
  locales/     en.json (default), hi.json
  store/       useCompressorStore (zustand)
```
