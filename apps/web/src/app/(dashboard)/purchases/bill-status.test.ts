import { describe, expect, it } from 'vitest';
import { BILL_STATUS_FILTER_OPTIONS, getBillStatusLabel, getBillStatusVariant } from './bill-status';

describe('bill status filter', () => {
  it('offers All, Received, Partially Paid, Paid and Overdue, and no Approved', () => {
    expect(BILL_STATUS_FILTER_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['', 'All Statuses'],
      ['received', 'Received'],
      ['partially_paid', 'Partially Paid'],
      ['paid', 'Paid'],
      ['overdue', 'Overdue'],
    ]);
  });

  it('only offers values that are bill statuses (a bill is never "approved")', () => {
    const billStatuses = ['draft', 'received', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    for (const option of BILL_STATUS_FILTER_OPTIONS) {
      if (option.value) expect(billStatuses).toContain(option.value);
    }
  });
});

describe('bill status labels', () => {
  it('names every status a bill can have', () => {
    expect(getBillStatusLabel('received')).toBe('Received');
    expect(getBillStatusLabel('overdue')).toBe('Overdue');
    expect(getBillStatusLabel('partially_paid')).toBe('Partially Paid');
    expect(getBillStatusLabel('cancelled')).toBe('Cancelled');
  });

  it('shades overdue as a warning and paid as success', () => {
    expect(getBillStatusVariant('overdue')).toBe('destructive');
    expect(getBillStatusVariant('paid')).toBe('success');
    expect(getBillStatusVariant('partially_paid')).toBe('warning');
  });
});
