import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './data-table';

const download = vi.hoisted(() => vi.fn());
const saveBlob = vi.hoisted(() => vi.fn());
const printHtml = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob, printHtml }));

interface Row {
  id: string;
  number: string;
  unit: string;
}

const COLUMNS: DataTableColumn<Row>[] = [
  { key: 'number', header: 'Request No.', cell: (row) => row.number },
  { key: 'unit', header: 'Unit', cell: (row) => <strong>{row.unit}</strong>, text: (row) => row.unit },
];

const rowsOf = (count: number, from = 1): Row[] =>
  Array.from({ length: count }, (_, i) => ({ id: `r${from + i}`, number: `TKT-${from + i}`, unit: `A-${from + i}` }));

function renderTable(overrides: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const props = {
    title: 'Open Requests',
    columns: COLUMNS,
    rows: rowsOf(3),
    rowKey: (row: Row) => row.id,
    total: 3,
    page: 1,
    pageSize: 25,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    emptyText: 'There are no open requests.',
    ...overrides,
  };
  return render(<DataTable<Row> {...props} />);
}

function bodyRows(): HTMLElement[] {
  return screen.getAllByRole('row').slice(1);
}

afterEach(() => {
  vi.useRealTimers();
  download.mockReset();
  saveBlob.mockReset();
  printHtml.mockReset();
});

describe('DataTable — serial numbers and pager', () => {
  it('numbers rows on, page after page', () => {
    renderTable({ rows: rowsOf(2, 101), total: 230, page: 2, pageSize: 100 });

    expect(screen.getAllByRole('columnheader')[0].textContent).toBe('S.No');
    expect(bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['101', '102']);
  });

  it('says which entries are showing', () => {
    renderTable({ rows: rowsOf(100, 101), total: 230, page: 2, pageSize: 100 });

    expect(screen.getByText('Showing 101 to 200 of 230 entries')).toBeTruthy();
  });

  it('moves between pages and stops at the ends', () => {
    const onPageChange = vi.fn();
    renderTable({ total: 230, page: 1, pageSize: 100, onPageChange });

    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(onPageChange.mock.calls).toEqual([[2], [3]]);
  });

  it('offers page sizes', () => {
    const onPageSizeChange = vi.fn();
    const { container } = renderTable({ pageSizeOptions: [25, 100], onPageSizeChange });

    const select = container.querySelector('select#data-table-page-size') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['25', '100']);
    fireEvent.change(select, { target: { value: '100' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(100);
  });

  it('shows the empty message, and an error with Retry', () => {
    const onRetry = vi.fn();
    const empty = renderTable({ rows: [], total: 0 });
    expect(screen.getByText('There are no open requests.')).toBeTruthy();
    empty.unmount();

    renderTable({ rows: [], total: 0, error: new Error('down'), onRetry });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('DataTable — search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('asks the server once the typing pauses, not on every key', () => {
    const onChange = vi.fn();
    renderTable({ search: { value: '', onChange, placeholder: 'Search' } });
    const box = screen.getByRole('searchbox');

    fireEvent.change(box, { target: { value: 'A' } });
    fireEvent.change(box, { target: { value: 'A-1' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('A-1');
  });
});

describe('DataTable — actions as labelled columns', () => {
  it('gives each action its own column with a labelled button per row', () => {
    const onPost = vi.fn();
    renderTable({
      actions: [
        { key: 'view', header: 'Action', label: 'View', onClick: vi.fn() },
        { key: 'post', header: 'Post Invoice', label: 'Post Invoice', onClick: onPost, hidden: (row) => row.id === 'r2' },
      ],
    });

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['S.No', 'Request No.', 'Unit', 'Action', 'Post Invoice']);
    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Post Invoice' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Post Invoice' })[0]);
    expect(onPost).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('can make an action a link', () => {
    renderTable({ actions: [{ key: 'view', header: 'Action', label: 'View', href: (row) => `/helpdesk/requests/${row.id}` }] });

    expect(screen.getAllByRole('link', { name: 'View' })[1].getAttribute('href')).toBe('/helpdesk/requests/r2');
  });
});

describe('DataTable — export strip', () => {
  const exportConfig = { path: '/tickets/export', params: { scope: 'open', q: 'A-1' }, filename: 'open-requests' };

  it.each([
    ['CSV', 'csv'],
    ['Excel', 'xlsx'],
    ['PDF', 'pdf'],
  ])('%s asks the server for the whole filtered result', async (label, format) => {
    const blob = new Blob(['x']);
    download.mockResolvedValue(blob);
    renderTable({ export: exportConfig });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: label }));
    });

    expect(download).toHaveBeenCalledWith('/tickets/export', { params: { scope: 'open', q: 'A-1', format } });
    expect(saveBlob).toHaveBeenCalledWith(blob, expect.stringMatching(new RegExp(`^open-requests-\\d{4}-\\d{2}-\\d{2}\\.${format}$`)));
  });

  it('shows the server’s message when the result is too large to export', async () => {
    download.mockRejectedValue(Object.assign(new Error('7000 rows match, and an export holds at most 5000. Narrow the search or filters and export again.'), { code: 'export_too_large' }));
    renderTable({ export: exportConfig });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    });

    expect(screen.getByRole('alert').textContent).toContain('Narrow the search or filters');
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it('says the export is not available yet when its route is not deployed (404)', async () => {
    download.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    renderTable({ export: exportConfig });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });

    expect(screen.getByRole('alert').textContent).toBe('This export is not available yet.');
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it('Copy puts the visible page on the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderTable({ export: exportConfig, rows: rowsOf(2) });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });

    expect(writeText).toHaveBeenCalledWith('S.No\tRequest No.\tUnit\n1\tTKT-1\tA-1\n2\tTKT-2\tA-2');
    expect(screen.getByRole('status').textContent).toBe('Copied 2 rows.');
  });

  it('Print prints a clean table of the visible page', () => {
    renderTable({ export: exportConfig, rows: rowsOf(1) });

    fireEvent.click(screen.getByRole('button', { name: 'Print' }));

    expect(printHtml).toHaveBeenCalledWith(expect.stringContaining('<td>1</td><td>TKT-1</td><td>A-1</td>'));
  });
});
