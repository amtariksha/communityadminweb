import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_CATALOGUE } from './catalogue-fixture';
import { ReportsIndex } from './reports-index';

const catalogue = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@/hooks/use-reports', () => ({ useReportCatalogue: () => catalogue.current }));
vi.mock('@/lib/vocabulary', () => ({ useWord: () => (word: string) => word }));

beforeEach(() => {
  catalogue.current = { data: SAMPLE_CATALOGUE, isLoading: false, error: null, refetch: vi.fn() };
});

const sectionTitles = (): string[] => screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '');
const numbersIn = (section: string): string[] =>
  within(screen.getByRole('region', { name: section }))
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('data-report-key'))
    .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');

describe('Admin Reports index (REP-04)', () => {
  it('lists the sections in index order with their group headings and fixed numbers', () => {
    render(<ReportsIndex />);

    expect(sectionTitles()).toEqual(['4. Income Tracker', '5. Expense Tracker', '6. General Ledger']);
    const income = within(screen.getByRole('region', { name: 'Income Tracker' }));
    expect(income.getByText('A. Frequently Used')).toBeTruthy();
    expect(income.getByText('B. Invoices')).toBeTruthy();
    expect(numbersIn('Income Tracker')).toEqual(['6', '11']);
    expect(numbersIn('General Ledger')).toEqual(['1', '—']);
  });

  it('keeps only the rows that match a search, numbers unchanged', () => {
    render(<ReportsIndex />);

    fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: 'aging' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(sectionTitles()).toEqual(['4. Income Tracker', '5. Expense Tracker']);
    expect(numbersIn('Income Tracker')).toEqual(['11']);
    expect(numbersIn('Expense Tracker')).toEqual(['1']);
  });

  it('says so when nothing matches', () => {
    render(<ReportsIndex />);

    fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: 'parking' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByText("No report matches 'parking'")).toBeTruthy();
  });

  it('gives a Planned row no link, and links a report to its run page', () => {
    render(<ReportsIndex />);

    const planned = screen.getByText('Ageing Report - by Unit').closest('tr') as HTMLElement;
    expect(within(planned).queryByRole('link')).toBeNull();
    expect(within(planned).getByText('Planned')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Balance Sheet' }).getAttribute('href')).toBe('/admin-reports/gl.balance_sheet');
  });

  it('leaves Schedule and Publish disabled until they are built', () => {
    render(<ReportsIndex />);

    const row = screen.getByText('Balance Sheet').closest('tr') as HTMLElement;
    expect((within(row).getByRole('button', { name: 'Schedule' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(row).getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('offers Retry when the catalogue fails, and a plain notice before the API has it', () => {
    catalogue.current = { data: undefined, isLoading: false, error: new Error('boom'), refetch: vi.fn() };
    const { unmount } = render(<ReportsIndex />);
    expect(screen.getByText('Could not load reports.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    unmount();

    catalogue.current = {
      data: undefined,
      isLoading: false,
      error: Object.assign(new Error('Not Found'), { status: 404 }),
      refetch: vi.fn(),
    };
    render(<ReportsIndex />);
    expect(screen.getByText('Reports are not available yet.')).toBeTruthy();
  });
});
