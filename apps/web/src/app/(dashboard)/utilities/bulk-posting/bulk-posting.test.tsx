import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkPostingContent } from './bulk-posting-content';

vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: (key: string) => (key === 'block' ? 'A' : null) }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/block-links', () => ({ UnitBlockLinks: () => null }));

describe('Utility Tracker › Bulk Posting (UTIL-12)', () => {
  it('offers only the rows whose ticket has shipped, for the chosen block', () => {
    render(<BulkPostingContent />);

    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('Calculated bills to invoices')).toBeTruthy();
    expect(screen.queryByText(/readings to invoices/i)).toBeNull();
    expect(screen.queryByText(/GSTIN/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Invoices in Batch' }).getAttribute('href')).toBe('/utilities/bulk-posting/bills?block=A');
  });
});
