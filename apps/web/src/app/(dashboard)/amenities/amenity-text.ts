import { safeWelcomeHtml } from '@/components/rich-text/safe-html';

/**
 * AMEN-22 — an amenity's Notes and Terms are rich text the API stores
 * sanitised. Lists show them as one line of text; the booking forms show
 * them as HTML, cut down again on this side before any innerHTML.
 */

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** The text without its markup. */
export function plainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|li)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

/** HTML safe to show (the welcome-message allow-list: https links only). */
export function safeAmenityHtml(html: string | null | undefined): string {
  return html ? safeWelcomeHtml(html) : '';
}
