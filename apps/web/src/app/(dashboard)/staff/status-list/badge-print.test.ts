import { describe, expect, it } from 'vitest';
import type { StaffRegisterRow } from '@/hooks/use-staff-register';
import { badgeHtml } from './badge-print';

/** STAFF-43 — the printed badge carries the ID card header (else the society name) and the back-side text. */

const row: StaffRegisterRow = {
  kind: 'domestic', id: 'w1', badge_no: '12', name: 'Test <Maid>', category_id: null, category_name: 'House Maids', designation: null,
  phone: null, status: 'active', status_reason: null, status_changed_at: null, join_date: null, exit_date: null,
  badge_valid_until: null, shift: null, units: 'A - 101', unit_ids: [],
};

describe('badgeHtml', () => {
  it('draws the header image on the card and the back text on its back', () => {
    const html = badgeHtml(row, { badge_header_image_url: 'https://files.example.test/h.png', badge_back_text: 'If found, return' }, 'Test Heights');
    expect(html).toContain('<img src="https://files.example.test/h.png"');
    expect(html).not.toContain('Test Heights');
    expect(html).toContain('data-side="back"');
    expect(html).toContain('If found, return');
    expect(html).toContain('A - 101');
  });

  it('prints the society name without a header, no back without text, and escapes what people typed', () => {
    const html = badgeHtml(row, { badge_header_image_url: null, badge_back_text: '  ' }, 'Test & Heights');
    expect(html).toContain('Test &amp; Heights');
    expect(html).toContain('Test &lt;Maid&gt;');
    expect(html).not.toContain('data-side="back"');
    expect(badgeHtml(row, { badge_header_image_url: 'javascript:alert(1)', badge_back_text: '' }, 'X')).not.toContain('<img');
  });
});
