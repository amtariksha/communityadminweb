import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ExpenseBulkPostingContent } from './bulk-posting-content';
import { expenseImport } from './expense-imports';

/** EXP-26 / EXP-S11 — the two tables of jobs, each with its batch entry and its Excel upload. */

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/components/import/import-log', () => ({ ImportLog: () => null }));

describe('By Vendors › Bulk Posting', () => {
  it('lists opening balances apart from the five batch jobs, each with both doors', () => {
    render(<ExpenseBulkPostingContent />);
    const opening = screen.getByRole('table', { name: 'Upload opening balances' });
    expect(within(opening).getByText('Vendor opening balances')).toBeTruthy();
    const batch = screen.getByRole('table', { name: 'Batch upload expenses' });
    expect(within(batch).getAllByRole('row').slice(1).map((row) => row.querySelector('td')?.textContent)).toEqual([
      'Vendor invoices', 'Vendor payments', 'Payments without invoice', 'Advance payments', 'Debit notes',
    ]);
    const links = within(batch).getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links.slice(0, 2)).toEqual(['/expense-tracker/by-vendors/bulk-posting/vendor_invoice?door=grid', '/expense-tracker/by-vendors/bulk-posting/vendor_invoice?door=excel']);
  });

  it('knows every job by its import type', () => {
    expect(expenseImport('vendor_payment')?.columns.map((column) => column.key)).toContain('invoice_no');
    expect(expenseImport('nothing')).toBeUndefined();
  });
});
