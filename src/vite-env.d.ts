/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare module 'heic-to' {
  export default function heicTo(options: { blob: Blob; type?: string; quality?: number }): Promise<Blob>;
}
