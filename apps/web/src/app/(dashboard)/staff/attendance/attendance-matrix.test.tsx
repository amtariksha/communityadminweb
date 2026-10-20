import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { AttendanceMatrix } from './attendance-matrix';

/**
 * Staff Manager › Attendance (STAFF-44, STAFF-S4): opens empty, fetches a
 * range of at most 62 days, shows P / L / LV per day with Total In Hours
 * (and the timings when ticked), exports that result; an older API keeps
 * today's list.
 */

const api = vi.hoisted(() => ({ get: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));

function renderMatrix(fallback?: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AttendanceMatrix fallback={fallback} />
    </QueryClientProvider>,
  );
}

async function fetchRange(from: string, to: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Date from'), { target: { value: from } });
  fireEvent.change(screen.getByLabelText('Date to'), { target: { value: to } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
  });
}

const page = {
  days: ['2026-09-01', '2026-09-02'],
  total: 1,
  data: [
    {
      kind: 'official', id: 's1', badge_no: '7', name: 'Test Guard', category_name: 'Security Guard', total_hours: 8,
      cells: [{ mark: 'P', hours: 8, first_in: '09:00', last_out: '18:00' }, { mark: 'LV', hours: 0, first_in: null, last_out: null }],
    },
  ],
};

beforeEach(() => {
  api.get.mockReset().mockResolvedValue(page);
  api.download.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('Attendance matrix', () => {
  it('opens empty and asks for a range before anything is read', () => {
    renderMatrix();
    expect(screen.getByText('Choose a date range and press Fetch.')).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches the range with the timings and shows a column per day and Total In Hours', async () => {
    renderMatrix();
    fireEvent.click(screen.getByLabelText('Show Check In and Check Out Timings'));
    await fetchRange('2026-09-01', '2026-09-02');
    await waitFor(() => expect(screen.getByText('Test Guard')).toBeTruthy());
    expect(api.get).toHaveBeenCalledWith('/staff/attendance/matrix', {
      params: { from: '2026-09-01', to: '2026-09-02', times: 'true', page: '1', limit: '40' },
    });
    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['Sl.No', 'Category / Badge', 'Name', '01/09', '02/09', 'Total In Hours']);
    expect(screen.getByText('P 09:00–18:00')).toBeTruthy();
    expect(screen.getByText('LV')).toBeTruthy();
    expect(screen.getByText('Security Guard / 7')).toBeTruthy();
    expect(screen.getByText('Rows 1 to 1')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });
    expect(api.download).toHaveBeenCalledWith('/staff/attendance/matrix/export', {
      params: { from: '2026-09-01', to: '2026-09-02', times: 'true', format: 'csv' },
    });
  });

  it('refuses more than 62 days without asking the server', async () => {
    renderMatrix();
    await fetchRange('2026-09-01', '2026-11-02');
    expect(screen.getByRole('alert').textContent).toBe('Choose at most 62 days.');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('an API without the matrix says not available yet and keeps today’s list', async () => {
    api.get.mockRejectedValue(new ApiError(404, { message: 'Not Found' } as never));
    renderMatrix(<p>Today’s list</p>);
    await fetchRange('2026-09-01', '2026-09-02');
    await waitFor(() => expect(screen.getByText('The attendance matrix is not available yet on this server.')).toBeTruthy());
    expect(screen.getByText('Today’s list')).toBeTruthy();
  });
});
