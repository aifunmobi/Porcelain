/**
 * A small Markdown -> HTML renderer. Preview only has to *display* markdown, so
 * this covers the block and inline forms people actually write and escapes
 * everything else. A parser dependency would be a lot of weight for that.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s: string): string =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

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
