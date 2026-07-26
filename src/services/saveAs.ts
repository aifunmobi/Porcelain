/**
 * Turning what an app is showing into bytes on disk, in a chosen format.
 *
 * Images go through a canvas, so "save this PNG as JPEG" really re-encodes —
 * renaming the extension would leave a PNG that every other program rejects.
 * Text conversions are the same small set the editor already round-trips.
 */

import { renderMarkdown } from '../apps/preview/markdown';

export interface SaveFormat {
  /** Extension without the dot, and what the filename ends up with. */
  ext: string;
  label: string;
  mime: string;
}

export const IMAGE_FORMATS: SaveFormat[] = [
  { ext: 'png', label: 'PNG image', mime: 'image/png' },
  { ext: 'jpg', label: 'JPEG image', mime: 'image/jpeg' },
];

export const TEXT_FORMATS: SaveFormat[] = [
  { ext: 'txt', label: 'Plain text', mime: 'text/plain' },
  { ext: 'md', label: 'Markdown', mime: 'text/markdown' },
];

export const MARKDOWN_FORMATS: SaveFormat[] = [
  { ext: 'md', label: 'Markdown', mime: 'text/markdown' },
  { ext: 'html', label: 'HTML document', mime: 'text/html' },
];

const JPEG_QUALITY = 0.92;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The image could not be read.'));
    img.src = src;
  });

const canvasBytes = async (canvas: HTMLCanvasElement, mime: string): Promise<Uint8Array> => {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, mime === 'image/jpeg' ? JPEG_QUALITY : undefined)
  );
  if (!blob) throw new Error(`This browser would not encode ${mime}.`);
  return new Uint8Array(await blob.arrayBuffer());
};

/**
 * Re-encode an image to `format`. JPEG has no alpha, so transparent pixels are
 * flattened onto white rather than turning black.
 */
export const encodeImage = async (
  source: string | HTMLCanvasElement,
  format: SaveFormat
): Promise<Uint8Array> => {
  if (typeof source !== 'string') {
    if (format.mime === 'image/png') return canvasBytes(source, format.mime);
    const flat = document.createElement('canvas');
    flat.width = source.width;
    flat.height = source.height;
    const ctx = flat.getContext('2d');
    if (!ctx) throw new Error('This browser would not provide a drawing context.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(source, 0, 0);
    return canvasBytes(flat, format.mime);
  }

  const img = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser would not provide a drawing context.');
  if (format.mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return canvasBytes(canvas, format.mime);
};

/** Text in, text out — markdown becomes a real HTML document when asked. */
export const encodeText = (text: string, format: SaveFormat, title = 'Document'): string => {
  if (format.ext !== 'html') return text;
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body>
${renderMarkdown(text)}
</body>
</html>`;
};

/** Swap a filename's extension for the chosen format's. */
export const withExtension = (name: string, format: SaveFormat): string =>
  `${name.replace(/\.[^./]+$/, '')}.${format.ext}`;

export const isImageFormat = (format: SaveFormat) => format.mime.startsWith('image/');
