import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnitDuesFilters, UnitDuesResult } from '@/hooks/use-unit-ledger';
import { MemberIncomeTable } from './member-income-table';

/**
 * INC-20 — the unit dues workbench: block links narrow the list, the
 * search asks the server for the chosen field, the header counts the
 * defaulters, and a server without the route says so.
 */

const mocks = vi.hoisted(() => ({
  calls: [] as UnitDuesFilters[],
  result: { data: [], total: 0, defaulter_count: 0 } as UnitDuesResult,
  error: null as unknown,
}));

vi.mock('@/hooks/use-unit-ledger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-unit-ledger')>();
  return {
    ...actual,
    useUnitDues: (filters: UnitDuesFilters) => {
      mocks.calls.push(filters);
      return { data: mocks.error ? undefined : mocks.result, isLoading: false, error: mocks.error, refetch: vi.fn() };
    },
  };
});

vi.mock('@/components/block-links', () => ({
  UnitBlockLinks: ({ onChange }: { onChange: (block: string | null) => void }) => (
    <div>
      <button type="button" onClick={() => onChange('A')}>
        Block A
      </button>
      <button type="button" onClick={() => onChange(null)}>
        All Blocks
      </button>
    </div>
  ),
}));

vi.mock('@/components/data-table/export-strip', () => ({ ExportStrip: () => null }));

const ROW = {
  unit_id: 'u-1',
  unit_number: 'A-101',
  block: 'A',
  primary_contact_name: 'Asha Rao',
  billing_name: 'Asha Rao',
  status: 'defaulter' as const,
  due: '2000.00',
  advance: '0.00',
};

function lastCall(): UnitDuesFilters {
  return mocks.calls[mocks.calls.length - 1];
}

describe('MemberIncomeTable', () => {
  beforeEach(() => {
    mocks.calls = [];
    mocks.error = null;
    mocks.result = { data: [ROW], total: 1, defaulter_count: 1 };
  });

  it('lists each unit with status and due, and counts the defaulters', () => {
    render(<MemberIncomeTable scope="member" title="Member Dues" rowActions={[]} exportFilename="member-dues" />);

    expect(screen.getByText('A-101')).toBeTruthy();
    expect(screen.getByText('Defaulter')).toBeTruthy();
    expect(screen.getByText('₹2,000')).toBeTruthy();
    expect(screen.getByText('Total Number of Defaulters : 1')).toBeTruthy();
    expect(lastCall()).toMatchObject({ scope: 'member', block: null, page: 1 });
  });

  it('narrows to a block and names it in the heading', () => {
    render(<MemberIncomeTable scope="member" title="Member Dues" rowActions={[]} exportFilename="member-dues" />);

    fireEvent.click(screen.getByRole('button', { name: 'Block A' }));

    expect(lastCall()).toMatchObject({ block: 'A', page: 1 });
    expect(screen.getByText('Residents under A')).toBeTruthy();
  });

  it('searches the field chosen beside the box', () => {
    render(<MemberIncomeTable scope="member" title="Member Dues" rowActions={[]} exportFilename="member-dues" />);

    fireEvent.change(screen.getByLabelText('Search units'), { target: { value: ' asha ' } });
    fireEvent.click(screen.getByLabelText('Primary Contact'));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(lastCall()).toMatchObject({ q: 'asha', q_field: 'primary_contact', page: 1 });
  });

  it('says what matched nothing', () => {
    mocks.result = { data: [], total: 0, defaulter_count: 0 };
    render(<MemberIncomeTable scope="member" title="Member Dues" rowActions={[]} exportFilename="member-dues" />);

    fireEvent.change(screen.getByLabelText('Search units'), { target: { value: 'zz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByText("No units match 'zz'.")).toBeTruthy();
  });

  it('shows the row buttons it is given, each in its own column', () => {
    render(
      <MemberIncomeTable
        scope="member"
        title="Member Dues"
        rowActions={[{ key: 'view', header: 'Account History', label: 'View', href: (row) => `/x/${row.unit_id}` }]}
        exportFilename="member-dues"
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Account History' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View' }).getAttribute('href')).toBe('/x/u-1');
  });

  it('says the list is not available yet on a server without the route', () => {
    mocks.error = { status: 404 };
    render(<MemberIncomeTable scope="member" title="Member Dues" rowActions={[]} exportFilename="member-dues" />);

    expect(screen.getByText('Member Dues is not available yet on this server.')).toBeTruthy();
  });
});
