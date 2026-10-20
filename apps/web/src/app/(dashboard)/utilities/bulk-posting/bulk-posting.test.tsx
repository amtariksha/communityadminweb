import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkPostingContent } from './bulk-posting-content';

vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: (key: string) => (key === 'block' ? 'A' : null) }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/block-links', () => ({ UnitBlockLinks: () => null }));

describe('Utility Tracker › Bulk Posting (UTIL-12)', () => {
  it('offers only the rows whose ticket has shipped, for the chosen block', () => {
    render(<BulkPostingContent />);

    // Header + water, electricity, gas readings (UTIL-15 / UTIL-16) + calculated bills (UTIL-07) + GSTIN / PAN (INC-60).
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('Calculated bills to invoices')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Update using Excel' }).getAttribute('href')).toBe('/income/members/bulk-posting/unit_billing_identity?door=excel');
    const batches = screen.getAllByRole('link', { name: 'Invoices in Batch' }).map((link) => link.getAttribute('href'));
    expect(batches).toEqual([
      '/utilities/bulk-posting/batch?meter_type=water&block=A',
      '/utilities/bulk-posting/batch?meter_type=electricity&block=A',
      '/utilities/bulk-posting/batch?meter_type=gas&block=A',
      '/utilities/bulk-posting/bills?block=A',
    ]);
  });

  it('opens the readings upload per meter type (UTIL-16)', () => {
    render(<BulkPostingContent />);
    expect(screen.getByText('Water readings to invoices')).toBeTruthy();
    const uploads = screen.getAllByRole('link', { name: 'Invoices using Excel' }).map((link) => link.getAttribute('href'));
    expect(uploads[0]).toBe('/utilities/bulk-posting/excel?meter_type=water&block=A');
    expect(uploads).toHaveLength(3);
  });
});
