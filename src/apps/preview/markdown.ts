/**
 * A small Markdown -> HTML renderer. Preview only has to *display* markdown, so
 * this covers the block and inline forms people actually write and escapes
 * everything else. A parser dependency would be a lot of weight for that.
 */

// Quotes are escaped too: the text lands inside attribute values (alt, href),
// where an unescaped `"` would let `![a"onerror=...](x)` close the attribute.
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Only link/image targets that cannot run code survive rendering. */
const safeUrl = (raw: string): string | null => {
  const url = raw.trim();
  if (/^(https?|mailto|tel):/i.test(url)) return url;
  if (/^(\/|\.\/|\.\.\/|#)/.test(url)) return url;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null; // javascript:, data:text/html, …
  return url;
};

const inline = (s: string): string => {
  // Code spans are lifted out first so their contents are not re-interpreted
  // as emphasis or links, then put back at the end.
  const codes: string[] = [];
  const withCode = escapeHtml(s).replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`);
    // A private-use code point no document text will contain.
    return `\uE000${codes.length - 1}\uE000`;
  });
  return withCode
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, url: string) => {
      const target = safeUrl(url);
      return target ? `<img alt="${alt}" src="${target}">` : alt;
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text: string, url: string) => {
      const target = safeUrl(url);
      return target ? `<a href="${target}" target="_blank" rel="noreferrer noopener">${text}</a>` : text;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\uE000(\d+)\uE000/g, (_, i: string) => codes[Number(i)]);
};

export const renderMarkdown = (source: string): string => {
  const out: string[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let listType: 'ul' | 'ol' | null = null;
  let inCode = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  for (const line of lines) {
    const fence = line.match(/^```/);
    if (fence) {
      closeParagraph();
      closeList();
      out.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line) + '\n');
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line.trim()) && line.trim().length >= 3) {
      closeParagraph();
      closeList();
      out.push('<hr>');
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeParagraph();
      closeList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      closeParagraph();
      const wanted = bullet ? 'ul' : 'ol';
      if (listType !== wanted) {
        closeList();
        out.push(`<${wanted}>`);
        listType = wanted;
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }
    paragraph.push(line.trim());
  }

  closeParagraph();
  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
};
