import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SetupContent } from './setup-content';

/**
 * Amenity & Event › Setup › Amenity (AMEN-10, screen AMEN-S1): active and
 * inactive amenities in their own sections, each with search and export;
 * Add Amenity and Edit open the amenity form as a page.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/hooks', () => ({
  useAmenities: () => ({
    isLoading: false,
    data: {
      data: [
        { id: 'am-1', name: 'Party Hall', amenity_type: 'party_hall', pricing_type: 'hourly', price_per_unit: 500, rules: 'No music after 10 pm', is_active: true, income_account_name: 'Clubhouse Charges' },
        { id: 'am-2', name: 'Guest Room', amenity_type: 'guest_room', pricing_type: 'free', price_per_unit: 0, rules: null, is_active: true },
        { id: 'am-3', name: 'Old Gym', amenity_type: 'gym', pricing_type: 'free', price_per_unit: 0, rules: null, is_active: false },
      ],
    },
  }),
}));

vi.mock('./notifications-card', () => ({ NotificationsCard: () => <p>Notification switches</p> }));

const rowsOf = (name: string) => within(screen.getByRole('table', { name })).getAllByRole('row').slice(1);

describe('SetupContent', () => {
  it('lists active amenities and inactive ones in their own section', () => {
    render(<SetupContent />);

    expect(rowsOf('Active Amenities').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Party Hall'),
      expect.stringContaining('Guest Room'),
    ]);
    expect(rowsOf('Inactive Amenities')).toHaveLength(1);
    expect(rowsOf('Inactive Amenities')[0].textContent).toContain('Old Gym');
  });

  it('shows the charge and the notes of each amenity', () => {
    render(<SetupContent />);

    const hall = rowsOf('Active Amenities')[0];
    expect(hall.textContent).toContain('Hourly');
    expect(hall.textContent).toContain('No music after 10 pm');
    expect(rowsOf('Active Amenities')[1].textContent).toContain('Free');
  });

  it('shows the income account, Other Income when none is set (AMEN-21)', () => {
    render(<SetupContent />);

    expect(rowsOf('Active Amenities')[0].textContent).toContain('Clubhouse Charges');
    expect(rowsOf('Active Amenities')[1].textContent).toContain('Other Income');
  });

  it('opens Add Amenity and Edit as pages', () => {
    render(<SetupContent />);

    expect(screen.getByRole('link', { name: 'Add Amenity' }).getAttribute('href')).toBe('/amenities/new');
    const edit = within(screen.getByRole('table', { name: 'Inactive Amenities' })).getByRole('link', { name: 'Edit' });
    expect(edit.getAttribute('href')).toBe('/amenities/am-3/edit');
  });

  it('gives each section its own export strip', () => {
    render(<SetupContent />);

    expect(screen.getAllByRole('button', { name: 'Excel' })).toHaveLength(2);
  });
});
