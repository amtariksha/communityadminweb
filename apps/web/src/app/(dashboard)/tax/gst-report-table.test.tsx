import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GstReportRow } from '@/hooks';
import { GstReportSection, gstRateLabel } from './gst-report-table';

/** R5-GSTWEB — Taxes › GST Invoice Report reads the API's real row (gst_percentage, IGST). */

const mocks = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock('@/hooks', () => ({
  useGstReport: () => ({ data: mocks.rows, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}));

// As GET /tax/gst/report sends them: NUMERIC columns as strings, the split as numbers.
const intraState: GstReportRow = {
  invoice_id: 'inv-1',
  invoice_number: 'INV-0001',
  invoice_date: '2026-10-01',
  unit_number: 'A-101',
  customer_name: null,
  taxable_amount: '10000.00',
  gst_percentage: '18.00',
  gst_amount: '1800.00',
  cgst: 900,
  sgst: 900,
  igst: 0,
  total: '11800.00',
  hsn_sac: '999598',
};
const interState: GstReportRow = {
  invoice_id: 'inv-2',
  invoice_number: 'INV-0002',
  invoice_date: '2026-10-02',
  unit_number: null,
  customer_name: 'Test Traders Pvt Ltd',
  taxable_amount: '5000.00',
  gst_percentage: '12.00',
  gst_amount: '600.00',
  cgst: 0,
  sgst: 0,
  igst: 600,
  total: '5600.00',
  hsn_sac: '997212',
};

function rowOf(invoiceNumber: string): HTMLElement {
  return screen.getByText(invoiceNumber).closest('tr') as HTMLElement;
}

describe('GstReportSection', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the rate from gst_percentage, never "undefined%"', () => {
    mocks.rows = [intraState];
    render(<GstReportSection from="2026-10-01" to="2026-10-31" />);

    expect(within(rowOf('INV-0001')).getByText('18%')).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  it('has an IGST column carrying the inter-state tax', () => {
    mocks.rows = [intraState, interState];
    render(<GstReportSection from="2026-10-01" to="2026-10-31" />);

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Invoice', 'Date', 'Unit', 'Taxable', 'Rate', 'CGST', 'SGST', 'IGST', 'Total']);

    const inter = within(rowOf('INV-0002')).getAllByRole('cell').map((cell) => cell.textContent);
    expect(inter[2]).toBe('Test Traders Pvt Ltd');
    expect(inter[4]).toBe('12%');
    expect(inter.slice(5, 8)).toEqual(['₹0', '₹0', '₹600']);

    const intra = within(rowOf('INV-0001')).getAllByRole('cell').map((cell) => cell.textContent);
    expect(intra.slice(5, 8)).toEqual(['₹900', '₹900', '₹0']);
  });

  it('lists every taxed line of an invoice without a duplicate-key warning', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.rows = [intraState, { ...intraState, gst_percentage: '5.00', cgst: 25, sgst: 25 }];
    render(<GstReportSection from="2026-10-01" to="2026-10-31" />);

    expect(screen.getAllByText('INV-0001')).toHaveLength(2);
    expect(screen.getByText('5%')).toBeTruthy();
    const keyWarnings = consoleError.mock.calls.filter((args) => args.some((arg) => String(arg).includes('same key')));
    expect(keyWarnings).toEqual([]);
  });
});

describe('gstRateLabel', () => {
  it('reads a number or a NUMERIC string, and a missing rate as a dash', () => {
    expect(gstRateLabel(18)).toBe('18%');
    expect(gstRateLabel('2.50')).toBe('2.5%');
    expect(gstRateLabel(null)).toBe('—');
    expect(gstRateLabel(undefined)).toBe('—');
    expect(gstRateLabel('abc')).toBe('—');
  });
});
