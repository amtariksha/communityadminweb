import { describe, expect, it } from 'vitest';
import type { StatementRow } from '@/hooks/use-unit-statement';
import { allocationTarget, exportLabel, reverseKind, rowMenu, tabFrom, unitLabel } from './statement-actions';

const row = (overrides: Partial<StatementRow>): StatementRow => ({
  doc_type: 'invoice',
  doc_id: 'inv-1',
  date: '2026-10-01',
  invoice_id: 'inv-1',
  invoice_no: 'INV-0001',
  receipt_no: null,
  account: 'Maintenance',
  description: 'Oct 2026',
  due: 3000,
  paid: 0,
  balance: 3000,
  reversal: false,
  actions: ['reverse', 'edit', 'view_allocation'],
  ...overrides,
});

describe('statement actions', () => {
  it('gives a finance writer every action the server offers', () => {
    expect(rowMenu(row({}), { canRead: true, canWrite: true }).map((item) => item.label)).toEqual([
      'Reverse',
      'Edit',
      'View Allocation',
    ]);
  });

  it('leaves a finance reader only View Allocation', () => {
    expect(rowMenu(row({}), { canRead: true, canWrite: false }).map((item) => item.action)).toEqual(['view_allocation']);
  });

  it('maps Reverse to cancel, void or waive by the kind of row', () => {
    expect(reverseKind(row({}))).toBe('cancel_invoice');
    expect(reverseKind(row({ doc_type: 'receipt' }))).toBe('void_receipt');
    expect(reverseKind(row({ doc_type: 'interest' }))).toBe('waive_interest');
    expect(reverseKind(row({ doc_type: 'credit_note' }))).toBeNull();
  });

  it('views the allocation of the document itself, or of the bill', () => {
    expect(allocationTarget(row({}))).toEqual({ docType: 'invoice', docId: 'inv-1' });
    expect(allocationTarget(row({ doc_type: 'receipt', doc_id: 'r-1' }))).toEqual({ docType: 'receipt', docId: 'r-1' });
    expect(allocationTarget(row({ doc_type: 'interest' }))).toBeNull();
  });

  it('names the export by its rows and the unit by its block', () => {
    expect(exportLabel(39)).toBe('Export rows 1–42');
    expect(unitLabel({ unit_number: '101', block: 'A' })).toBe('A-101');
    expect(unitLabel({ unit_number: '101', block: null })).toBe('101');
    expect(tabFrom('due')).toBe('due');
    expect(tabFrom('anything')).toBe('admin');
  });
});
