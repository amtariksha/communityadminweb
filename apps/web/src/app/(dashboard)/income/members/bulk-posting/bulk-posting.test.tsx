import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemberBulkPostingContent } from './bulk-posting-content';
import { memberImport } from './member-imports';

/** INC-S23 — Member Income › Bulk Posting: headed matrices, each job with its batch and Excel doors. */

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/components/import/import-log', () => ({ ImportLog: () => null }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));

describe('Member Income › Bulk Posting', () => {
  it('offers Upload Opening Balances with both doors', () => {
    render(<MemberBulkPostingContent />);
    const opening = screen.getByRole('table', { name: 'Upload Opening Balances' });
    expect(within(opening).getByText('Opening balances of units')).toBeTruthy();
    expect(within(opening).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/income/members/bulk-posting/unit_opening_balance?door=grid',
      '/income/members/bulk-posting/unit_opening_balance?door=excel',
    ]);
  });

  it('lists the three invoice jobs under Post Invoices in Bulk', () => {
    render(<MemberBulkPostingContent />);
    const invoices = screen.getByRole('table', { name: 'Post Invoices in Bulk' });
    expect(within(invoices).getAllByRole('row').slice(1).map((row) => row.querySelector('td')?.textContent)).toEqual([
      'Single-account invoices',
      'Multi-line invoices',
      'Debit notes',
    ]);
  });

  it('knows each job by its import type, and opening balances are the community admin’s', () => {
    expect(memberImport('unit_opening_balance')?.roles).toEqual(['super_admin', 'community_admin']);
    expect(memberImport('nothing')).toBeUndefined();
  });
});
