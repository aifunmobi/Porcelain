/**
 * The find/replace machinery for a contenteditable surface. Matches are located
 * over the element's flattened text and mapped back onto DOM Ranges, so nothing
 * has to be re-parsed out of the HTML and formatting survives a replace.
 */

export interface TextChunk {
  node: Text;
  start: number;
  end: number;
}

/** Every text node under `root`, tagged with its offset in the flattened text. */
export const collectTextChunks = (root: Node): { chunks: TextChunk[]; text: string } => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const chunks: TextChunk[] = [];
  let text = '';
  let node = walker.nextNode() as Text | null;
  while (node) {
    const start = text.length;
    text += node.data;
    chunks.push({ node, start, end: text.length });
    node = walker.nextNode() as Text | null;
  }
  return { chunks, text };
};

export const findMatchOffsets = (
  text: string,
  query: string,
  caseSensitive: boolean
): Array<[number, number]> => {
  if (!query) return [];
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const out: Array<[number, number]> = [];
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    out.push([at, at + needle.length]);
    from = at + needle.length; // non-overlapping, like every editor's find
  }
  return out;
};

/** Turn a [start, end) span of the flattened text back into a live Range. */
export const rangeForOffsets = (chunks: TextChunk[], start: number, end: number): Range | null => {
  const startChunk = chunks.find((c) => start >= c.start && start < c.end);
  const endChunk = chunks.find((c) => end > c.start && end <= c.end);
  if (!startChunk || !endChunk) return null;
  const range = document.createRange();
  range.setStart(startChunk.node, start - startChunk.start);
  range.setEnd(endChunk.node, end - endChunk.start);
  return range;
};

type HighlightCtor = new (...ranges: Range[]) => unknown;
interface HighlightRegistry {
  set: (name: string, highlight: unknown) => void;
  delete: (name: string) => void;
}

const highlightRegistry = (): HighlightRegistry | null => {
  const css = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  return css?.highlights ?? null;
};

/**
 * Paint find matches without touching the document. The CSS Custom Highlight API
 * does this natively; where it is missing the app still counts and cycles
 * matches, it just cannot tint them.
 */
export const paintHighlights = (ranges: Range[], activeIndex: number) => {
  const registry = highlightRegistry();
  const Ctor = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight;
  if (!registry || !Ctor) return;
  registry.delete('pcl-find');
  registry.delete('pcl-find-active');
  if (!ranges.length) return;
  const rest = ranges.filter((_, i) => i !== activeIndex);
  if (rest.length) registry.set('pcl-find', new Ctor(...rest));
  if (ranges[activeIndex]) registry.set('pcl-find-active', new Ctor(ranges[activeIndex]));
};

export const clearHighlights = () => {
  const registry = highlightRegistry();
  registry?.delete('pcl-find');
  registry?.delete('pcl-find-active');
};

const BLOCK_SELECTOR = 'div,p,h1,h2,h3,h4,h5,h6,li,blockquote,pre';

const isElement = (node: Node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE;

/** Inline content of one block: text, with `<br>` as a line break. */
const inlineText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return (node as Text).data;
  if (!isElement(node)) return '';
  if (node.tagName === 'BR') return '\n';
  return [...node.childNodes].map(inlineText).join('');
};

/**
 * HTML -> plain text, one line per leaf block. `innerText` cannot be used here:
 * it renders `<div><br></div>` — how an empty line is represented — as two
 * newlines, so every plain/rich toggle would grow the document by a blank line.
 *
 * Text that sits directly under the root (the first line typed into an empty
 * surface is a bare text node, before the browser starts wrapping lines in
 * divs) counts as a line of its own rather than being dropped.
 */
export const htmlToText = (root: HTMLElement): string => {
  const lines: string[] = [];
  let pending: string | null = null;
  const flush = () => {
    if (pending !== null) lines.push(...pending.split('\n'));
    pending = null;
  };
  const visit = (node: Node) => {
    if (isElement(node) && node.matches(BLOCK_SELECTOR)) {
      flush();
      if (node.querySelector(BLOCK_SELECTOR)) {
        [...node.childNodes].forEach(visit);
        flush();
      } else {
        // A trailing <br> is the block's own terminator, not an extra line.
        lines.push(inlineText(node).replace(/\n$/, ''));
      }
      return;
    }
    if (isElement(node) && node.tagName === 'BR') {
      pending = pending ?? '';
      flush();
      return;
    }
    pending = (pending ?? '') + inlineText(node);
  };
  [...root.childNodes].forEach(visit);
  flush();
  return lines.join('\n');
};

/** Plain text -> HTML, one block per line, so a mode switch keeps the shape. */
export const textToHtml = (text: string): string => {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n');
  if (!lines.some(Boolean)) return '';
  return lines.map((line) => `<div>${line ? escape(line) : '<br>'}</div>`).join('');
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A full HTML document for saving, so reopening restores the formatting. */
export const wrapHtmlDocument = (body: string, title: string): string =>
  `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
${body}
</body>
</html>`;

/** Pull the body back out of a saved document; tolerate a bare fragment too. */
export const unwrapHtmlDocument = (html: string): string => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match ? match[1] : html).trim();
};

/* ------------------------------------------------------------ sanitising */

const DROP_ELEMENTS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE',
  'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'TEMPLATE', 'NOSCRIPT',
  'FRAME', 'FRAMESET', 'SVG', 'MATH',
]);
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'background']);

/** True for a link/image target that cannot run code. */
export const isSafeUrl = (value: string, allowDataImage = false): boolean => {
  // Control characters are dropped first: "java\tscript:" is still javascript:.
  const trimmed = [...value.trim()]
    .filter((c) => c.charCodeAt(0) > 0x1f && c.charCodeAt(0) !== 0x7f)
    .join('');
  if (!trimmed) return true;
  if (/^(https?|mailto|tel):/i.test(trimmed)) return true;
  if (/^(\/|\.\/|\.\.\/|#|\?)/.test(trimmed)) return true;
  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(trimmed)) return true;
  // Anything with a scheme we did not list (javascript:, vbscript:, data:text…).
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return true;
};

/**
 * Strip what could execute when the fragment lands in a contenteditable via
 * innerHTML: script-like elements, `on*` handlers, and `javascript:` URLs.
 * Formatting is left alone. Files come from Files/desktop, so an .html a user
 * did not author gets the same treatment as one they did.
 */
export const sanitizeHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (DROP_ELEMENTS.has(child.tagName.toUpperCase())) {
        child.remove();
        continue;
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc') {
          child.removeAttribute(attr.name);
        } else if (URL_ATTRIBUTES.has(name) && !isSafeUrl(attr.value, child.tagName === 'IMG')) {
          child.removeAttribute(attr.name);
        } else if (name === 'style' && /expression\s*\(|url\s*\(\s*['"]?\s*javascript:/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
};
