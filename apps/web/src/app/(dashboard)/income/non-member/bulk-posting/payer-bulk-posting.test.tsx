import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PayerBulkPostingContent } from './payer-bulk-posting-content';
import { payerImport } from './payer-imports';

/** INC-S32 — Non Member Income › Bulk Posting: the two matrices, each job with both doors. */

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/components/import/import-log', () => ({ ImportLog: () => null }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));

describe('Non Member Income › Bulk Posting', () => {
  it('offers payer opening balances, invoices and collections with both doors', () => {
    render(<PayerBulkPostingContent />);
    expect(within(screen.getByRole('table', { name: 'Upload Opening Balances' })).getByText('Opening balances of payers')).toBeTruthy();
    const posting = screen.getByRole('table', { name: 'Post Invoices & Collection in Bulk' });
    expect(within(posting).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/income/non-member/bulk-posting/payer_invoice?door=grid',
      '/income/non-member/bulk-posting/payer_invoice?door=excel',
      '/income/non-member/bulk-posting/payer_collection?door=grid',
      '/income/non-member/bulk-posting/payer_collection?door=excel',
    ]);
  });

  it('sends collections to the receipts imports and keeps opening balances to the community admin', () => {
    expect(payerImport('payer_collection')?.endpoint).toBe('/receipts/imports');
    expect(payerImport('payer_opening_balance')?.roles).toEqual(['super_admin', 'community_admin']);
  });
});
