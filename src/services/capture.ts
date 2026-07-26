/**
 * Rasterise part of the Porcelain desktop to a PNG.
 *
 * Hand-rolled rather than pulling in html-to-image: the page is wrapped in an
 * SVG <foreignObject>, which the browser renders through its normal layout
 * engine. The only real work is carrying the stylesheets across, since the
 * cloned markup has no document to inherit from.
 *
 * This captures the Porcelain desktop only. A web page cannot see the host
 * macOS screen, and nothing here tries to.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Every rule the page has, flattened. Cross-origin sheets are skipped. */
const collectCss = (): string => {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) chunks.push(rule.cssText);
    } catch {
      // A stylesheet from another origin; nothing we can read or need.
    }
  }
  return chunks.join('\n');
};

/** Inline variables set on <html> — the theme lives there, not in a sheet. */
const rootInlineStyle = (): string => {
  const style = document.documentElement.getAttribute('style');
  return style ? `:root{${style}}` : '';
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The captured markup could not be rasterised.'));
    img.src = src;
  });

/**
 * Render `element` to a canvas. `clip` (in viewport coordinates) crops the
 * result, which is how region capture works — the whole surface is drawn once
 * and then cut, so the selection overlay never appears in the output.
 */
export const rasterise = async (element: HTMLElement, clip?: Rect): Promise<HTMLCanvasElement> => {
  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));

  const clone = element.cloneNode(true) as HTMLElement;
  // Elements deliberately excluded from their own screenshot (the shutter UI).
  clone.querySelectorAll('[data-capture-ignore]').forEach((node) => node.remove());
  clone.style.margin = '0';
  clone.style.transform = 'none';

  const css = `${rootInlineStyle()}\n${collectCss()}`;
  const markup = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px">` +
    `<style>${css.replace(/<\/style>/gi, '')}</style>${markup}` +
    `</div></foreignObject></svg>`;

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = await loadImage(url);

  // ponytail: 1 device pixel per CSS pixel. At devicePixelRatio a full-desktop
  // PNG runs to several megabytes, which overruns the browser backend's
  // localStorage budget; raise this once binaries live somewhere with room.
  const ratio = 1;
  const out = document.createElement('canvas');
  const cw = clip ? Math.max(1, Math.round(clip.width)) : width;
  const ch = clip ? Math.max(1, Math.round(clip.height)) : height;
  out.width = Math.round(cw * ratio);
  out.height = Math.round(ch * ratio);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('This browser would not provide a drawing context.');
  ctx.scale(ratio, ratio);
  if (clip) {
    ctx.drawImage(image, clip.x - bounds.left, clip.y - bounds.top, cw, ch, 0, 0, cw, ch);
  } else {
    ctx.drawImage(image, 0, 0, width, height);
  }
  return out;
};

export const canvasToPngBytes = async (canvas: HTMLCanvasElement): Promise<Uint8Array> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The capture could not be encoded as PNG.');
  return new Uint8Array(await blob.arrayBuffer());
};

export const copyCanvasToClipboard = async (canvas: HTMLCanvasElement): Promise<void> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The capture could not be encoded as PNG.');
  const anyWindow = window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => unknown };
  if (!anyWindow.ClipboardItem || !navigator.clipboard?.write) {
    throw new Error('This browser will not accept images on the clipboard.');
  }
  const item = new anyWindow.ClipboardItem({ 'image/png': blob });
  await (navigator.clipboard.write as (items: unknown[]) => Promise<void>)([item]);
};

/** "Screenshot 2026-07-25 at 19.04.11.png", the shape macOS uses. */
export const screenshotName = (now: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
  return `Screenshot ${date} at ${time}.png`;
};
