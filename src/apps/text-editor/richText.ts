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

/** Plain text -> HTML, one block per line, so a mode switch keeps the shape. */
export const textToHtml = (text: string): string => {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n');
  if (!lines.some(Boolean)) return '';
  return lines.map((line) => `<div>${line ? escape(line) : '<br>'}</div>`).join('');
};

/** A full HTML document for saving, so reopening restores the formatting. */
export const wrapHtmlDocument = (body: string, title: string): string =>
  `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body>
${body}
</body>
</html>`;

/** Pull the body back out of a saved document; tolerate a bare fragment too. */
export const unwrapHtmlDocument = (html: string): string => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (match ? match[1] : html).trim();
};
