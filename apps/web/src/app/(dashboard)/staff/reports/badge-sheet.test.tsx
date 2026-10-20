import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BadgeCard, BadgeSheetData } from '@/hooks/use-staff-badges';
import { BadgeSheet } from './badge-sheet';

/** STAFF-31 — the printed badge cards, front and back. */

const card = (index: number): BadgeCard => ({
  badge_no: String(100 + index),
  qr_token: 'f'.repeat(31) + String(index % 10),
  kind: 'Official',
  name: `Guard ${index}`,
  category: 'Security Guard',
  status: 'active',
  badge_valid_until: index === 1 ? '2026-12-31' : null,
  units: index === 2 ? 'A - 101' : null,
  photo_url: index === 1 ? 'https://storage.example.test/tenants/t/documents/photo.jpg?X-Amz-Signature=abc' : null,
});

const sheet: BadgeSheetData = {
  society_name: 'Green Meadows',
  header_image_url: 'https://storage.example.test/tenants/t/documents/header.png?X-Amz-Signature=abc',
  back_text: 'If found, return to the society office.',
  cards: Array.from({ length: 10 }, (_, index) => card(index + 1)),
};

describe('badge sheet', () => {
  it('prints 10 front cards with the header image and the validity', () => {
    const { container } = render(<BadgeSheet sheet={sheet} variant="badges" />);
    const fronts = container.querySelectorAll('[data-side="front"]');
    expect(fronts).toHaveLength(10);
    expect(fronts[0].querySelector('.top img')?.getAttribute('src')).toBe(sheet.header_image_url);
    expect(fronts[0].textContent).toContain('Valid till 31/12/2026');
    expect(fronts[1].textContent).toContain('No expiry');
    expect(fronts[0].querySelector('img.photo')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('adds the units and the QR on the units & QR sheet, and prints the society name without a header image', () => {
    const { container } = render(<BadgeSheet sheet={{ ...sheet, header_image_url: null }} variant="badges_units_qr" />);
    expect(container.querySelectorAll('svg')).toHaveLength(10);
    expect(container.querySelectorAll('[data-side="front"]')[1].textContent).toContain('Units: A - 101');
    expect(container.querySelector('.top')?.textContent).toBe('Green Meadows');
  });

  it('prints the back side once per card', () => {
    const { container } = render(<BadgeSheet sheet={sheet} variant="back" />);
    const backs = container.querySelectorAll('[data-side="back"]');
    expect(backs).toHaveLength(10);
    expect(backs[0].textContent).toContain('If found, return to the society office.');
  });

  it('never draws an image that is not https', () => {
    const { container } = render(<BadgeSheet sheet={{ ...sheet, header_image_url: 'javascript:alert(1)' }} variant="badges" />);
    expect(container.querySelector('.top img')).toBeNull();
  });
});
