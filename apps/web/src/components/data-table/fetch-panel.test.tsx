import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './data-table';
import { FetchPanel } from './fetch-panel';
import type { FetchCriteria } from './fetch-criteria';

vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));

interface Row {
  id: string;
  number: string;
}

const COLUMNS: DataTableColumn<Row>[] = [{ key: 'number', header: 'Receipt No.', cell: (row) => row.number }];
const CHOICES = [
  { value: 'all', label: 'All' },
  { value: 'reversed', label: 'Reversed' },
];

// A register page in miniature: rows come from the last fetched criteria.
function Register({ onFetch }: { onFetch: (criteria: FetchCriteria) => void }): ReactNode {
  const [criteria, setCriteria] = useState<FetchCriteria | null>(null);
  const rows = criteria ? [{ id: 'r1', number: `RCT-${criteria.choice}` }] : [];
  return (
    <DataTable<Row>
      title="Receipts"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      total={rows.length}
      page={1}
      pageSize={25}
      onPageChange={vi.fn()}
      search={{ value: '', onChange: vi.fn() }}
      export={{ path: '/receipts/export', params: {}, filename: 'receipts' }}
      emptyText="No receipts."
      fetchMode={{
        fetched: criteria !== null,
        panel: (
          <FetchPanel
            title="Fetch receipts"
            range="number"
            rangeLabel="Receipt No."
            choices={CHOICES}
            onFetch={(next) => {
              onFetch(next);
              setCriteria(next);
            }}
          />
        ),
      }}
    />
  );
}

const fetchButton = () => screen.getByRole('button', { name: 'Fetch' });

describe('FetchPanel in a DataTable (SB-09)', () => {
  it('opens empty: no rows, no search, no export, no pager until Fetch', () => {
    render(<Register onFetch={vi.fn()} />);

    const body = screen.getAllByRole('row').slice(1);
    expect(body).toHaveLength(1);
    expect(within(body[0]).getByRole('cell').textContent).toBe('Choose what to show above and press Fetch.');
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Export' })).toBeNull();
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it('fetches with the range and the radio choice, then shows the rows', () => {
    const onFetch = vi.fn();
    render(<Register onFetch={onFetch} />);

    fireEvent.change(screen.getByLabelText('Receipt No. from'), { target: { value: ' 101 ' } });
    fireEvent.change(screen.getByLabelText('Receipt No. to'), { target: { value: '120' } });
    fireEvent.click(screen.getByLabelText('Reversed'));
    fireEvent.click(fetchButton());

    expect(onFetch).toHaveBeenCalledWith({ from: '101', to: '120', choice: 'reversed' });
    expect(screen.getByText('RCT-reversed')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Export' })).toBeTruthy();
    expect(screen.getByRole('searchbox')).toBeTruthy();
  });

  it('says what is wrong and fetches nothing for a backwards range', () => {
    const onFetch = vi.fn();
    render(<Register onFetch={onFetch} />);

    fireEvent.change(screen.getByLabelText('Receipt No. from'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Receipt No. to'), { target: { value: '101' } });
    fireEvent.click(fetchButton());

    expect(screen.getByRole('alert').textContent).toBe('The from number is after the to number.');
    expect(onFetch).not.toHaveBeenCalled();
  });

  it('starts on the first choice', () => {
    render(<Register onFetch={vi.fn()} />);
    expect((screen.getByLabelText('All') as HTMLInputElement).checked).toBe(true);
  });
});

describe('FetchPanel extra controls (AMEN-11)', () => {
  it("shows the register's own controls before Fetch, and still fetches the range", () => {
    const onFetch = vi.fn();
    render(
      <FetchPanel
        title="Fetch reservations"
        range="date"
        extra={<label>Confirmed<input type="checkbox" /></label>}
        onFetch={onFetch}
      />,
    );

    const form = screen.getByRole('form', { name: 'Fetch reservations' });
    const controls = Array.from(form.querySelectorAll('input, button')).map((el) => el.getAttribute('type') ?? el.tagName);
    expect(controls.indexOf('checkbox')).toBeLessThan(controls.indexOf('submit'));
    fireEvent.click(within(form).getByRole('button', { name: 'Fetch' }));
    expect(onFetch).toHaveBeenCalledWith({ from: '', to: '', choice: '' });
  });
});

describe('FetchPanel extra controls (BANK-08)', () => {
  it('shows them and refuses Fetch while they are not set', () => {
    const onFetch = vi.fn();
    let account = '';
    const { rerender } = render(
      <FetchPanel title="Fetch register" range="date" extra={<span>Account picker</span>} extraError={() => (account ? null : 'Choose an account.')} onFetch={onFetch} />,
    );
    expect(screen.getByText('Account picker')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(screen.getByRole('alert').textContent).toBe('Choose an account.');
    expect(onFetch).not.toHaveBeenCalled();

    account = 'ba-1';
    rerender(<FetchPanel title="Fetch register" range="date" extra={<span>Account picker</span>} extraError={() => (account ? null : 'Choose an account.')} onFetch={onFetch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(onFetch).toHaveBeenCalled();
  });
});
