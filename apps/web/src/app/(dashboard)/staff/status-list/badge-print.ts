import type { StaffRegisterRow } from '@/hooks/use-staff-register';
import type { StaffSettings } from '@/hooks/use-staff-settings';
import { formatDate } from '@/lib/utils';

/**
 * One staff badge to print (STAFF-S2 row action "Badge", STAFF-43): the ID
 * card header image (else the society's name), the person's badge, name,
 * category and flats, and the back-side text on a second card.
 */

const ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char]);

// Only an https image is drawn: the API keeps the header to this society's upload.
const safeImage = (url: string | null): string | null => (url && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null);

export function badgeHtml(row: StaffRegisterRow, settings: StaffSettings | null, societyName: string): string {
  const header = safeImage(settings?.badge_header_image_url ?? null);
  const top = header
    ? `<img src="${escape(header)}" alt="" style="max-width:100%;max-height:60px;object-fit:contain" />`
    : `<div style="font-weight:700;font-size:15px">${escape(societyName)}</div>`;
  const line = (label: string, value: string | null) => (value ? `<div><span style="color:#555">${label}:</span> ${escape(value)}</div>` : '');
  const back = settings?.badge_back_text.trim() ?? '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Badge ${escape(row.badge_no ?? '')}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 16px; }
  .card { width: 54mm; min-height: 86mm; border: 1px solid #333; border-radius: 6px; padding: 8px; margin-bottom: 8mm; box-sizing: border-box; font-size: 12px; page-break-inside: avoid; }
  .badge { font-size: 22px; font-weight: 700; margin: 8px 0; }
</style></head><body>
<div class="card" data-side="front">
  <div style="text-align:center;border-bottom:1px solid #ccc;padding-bottom:6px">${top}</div>
  <div class="badge">${escape(row.badge_no ?? '—')}</div>
  <div style="font-size:15px;font-weight:600">${escape(row.name)}</div>
  ${line('Category', row.category_name)}
  ${line('Type', row.kind === 'official' ? 'Official' : 'Domestic')}
  ${line('Units', row.units)}
  ${line('Valid till', row.badge_valid_until ? formatDate(row.badge_valid_until) : null)}
</div>
${back ? `<div class="card" data-side="back" style="white-space:pre-wrap">${escape(back)}</div>` : ''}
</body></html>`;
}
