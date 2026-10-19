/**
 * What a browser's editor (contentEditable) writes, put in the words the
 * API keeps (PROF-21's allow-list): <b> → <strong>, <i> → <em>, a <div> per
 * line → <p>. The API sanitises again; this keeps the saved text tidy.
 */
const RENAMES: ReadonlyArray<[RegExp, string]> = [
  [/<(\/?)b(?=[\s>/])[^>]*>/gi, '<$1strong>'],
  [/<(\/?)i(?=[\s>/])[^>]*>/gi, '<$1em>'],
  [/<(\/?)div(?=[\s>/])[^>]*>/gi, '<$1p>'],
];

export function normaliseEditorHtml(html: string): string {
  return RENAMES.reduce((text, [pattern, to]) => text.replace(pattern, to), html).trim();
}

/** Whether the editor holds nothing a reader would see. */
export function isBlankHtml(html: string): boolean {
  if (/<img\b/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';
}

/** A link the editor may insert: https only. */
export function isSafeLink(url: string): boolean {
  return /^https:\/\/[^\s"'<>`]+$/i.test(url.trim());
}
