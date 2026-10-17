import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { useDashboardSummary } from './use-analytics';

/**
 * DASH-06 — one request supplies every classic-dashboard figure. The financial
 * year is part of the query, so choosing another year fetches again.
 */

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

const get = vi.mocked(api.get);

const SUMMARY = {
  period: { fy_id: 'fy-1', label: '2026 to 2027', start_date: '2026-04-01', end_date: '2027-03-31' },
  units: { total: 40, occupied: 30 },
  helpdesk: { open: 4, overdue: 1 },
  utility: null,
};

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useDashboardSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: SUMMARY });
  });

  it('asks for the current year when no year is given, and returns the unwrapped summary', async () => {
    const { result } = renderHook(() => useDashboardSummary(undefined), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(get).toHaveBeenCalledWith('/analytics/dashboard-summary', undefined);
    expect(result.current.data?.helpdesk).toEqual({ open: 4, overdue: 1 });
    expect(result.current.data?.utility).toBeNull();
  });

  it('sends the chosen financial year as fy_id', async () => {
    const { result } = renderHook(() => useDashboardSummary('fy-0'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(get).toHaveBeenCalledWith('/analytics/dashboard-summary', { params: { fy_id: 'fy-0' } });
  });

  it('fetches again when the year changes', async () => {
    const { result, rerender } = renderHook(({ fy }) => useDashboardSummary(fy), {
      wrapper: wrapper(),
      initialProps: { fy: 'fy-1' as string | undefined },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ fy: 'fy-0' });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenLastCalledWith('/analytics/dashboard-summary', { params: { fy_id: 'fy-0' } });
  });
});
