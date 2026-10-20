/**
 * Footers and payment instructions (INC-40, INC-42) are edited as plain
 * lines in a textarea: each line becomes a paragraph, and basic tags typed
 * by hand (<b>, <i>, <u>, <ul><li>…) pass through. The server cuts the HTML
 * to its allow-list on every save; the page never renders it as HTML.
 */

// A line that already opens or closes a block is not wrapped in <p>.
const BLOCK_LINE = /^<\/?(p|ul|ol|li)\b/i;

// A "<" that does not start one of the basic tags is text ("Pay to <society name>"):
// escaped so the server's allow-list does not drop it as an unknown tag.
const NOT_A_TAG = /<(?!\/?(?:p|br|b|strong|i|em|u|ol|ul|li|sub|sup|a)(?=[\s>/]))/gi;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/gi, (_whole, name: string) => ENTITIES[name.toLowerCase()] ?? '');
}

/** The lines as HTML paragraphs; null when there is no text. */
export function linesToHtml(text: string): string | null {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (lines.length === 0) return null;
  return lines
    .map((line) => {
      const text = line.replace(NOT_A_TAG, '&lt;');
      return BLOCK_LINE.test(line) ? text : `<p>${text}</p>`;
    })
    .join('');
}

/** Stored HTML back as editable lines: paragraphs and line breaks become new lines. */
export function htmlToLines(html: string | null | undefined): string {
  if (!html) return '';
  const lines = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '\n')
    .split('\n')
    .map((line) => decodeEntities(line).trim())
    .filter((line) => line !== '');
  return lines.join('\n');
}
