import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TallyCsvLedgerField, csvLedgerOption } from './tally-csv-ledger-field';

/** Tally CSV ledger report: the ledger it is for goes up as ledger_name, only when typed. */
describe('Tally CSV ledger report field', () => {
  afterEach(cleanup);

  it('sends ledger_name for a ledger report with a name only', () => {
    expect(csvLedgerOption('ledger_report', '  Bank Account ')).toEqual({ ledger_name: 'Bank Account' });
    expect(csvLedgerOption('ledger_report', '   ')).toEqual({});
    expect(csvLedgerOption('day_book', 'Bank Account')).toEqual({});
  });

  it('reports what is typed', () => {
    const onChange = vi.fn();
    render(<TallyCsvLedgerField value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Ledger this report is for'), { target: { value: 'Cash in Hand' } });
    expect(onChange).toHaveBeenCalledWith('Cash in Hand');
  });
});
