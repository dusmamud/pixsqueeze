import { zip } from 'fflate';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadAsZip(files: { name: string; blob: Blob }[], zipName: string) {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[f.name] = new Uint8Array(await f.blob.arrayBuffer());
  const zipped = await new Promise<Uint8Array>((resolve, reject) =>
    zip(entries, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data))),
  );
  downloadBlob(new Blob([zipped as BlobPart], { type: 'application/zip' }), zipName);
}
