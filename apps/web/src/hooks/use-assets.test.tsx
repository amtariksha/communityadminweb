import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { useLogService, useServiceLogs } from './use-assets';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

function withQueryClient(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: {} });
  });

  // The Service History tab lists every asset's logs by default. Logging a
  // service used to refresh only that one asset's list, so the new row (and
  // its Next Due date) did not appear until the page was reloaded.
  it('refreshes the all-assets service list, not only the one asset', async () => {
    const { result } = renderHook(
      () => ({ allLogs: useServiceLogs(''), logService: useLogService() }),
      { wrapper: withQueryClient() },
    );
    await waitFor(() => expect(result.current.allLogs.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.logService.mutateAsync({
        asset_id: 'asset-1',
        service_type: 'maintenance',
        service_date: '2026-10-10',
        description: 'Oil and filter change',
        next_service_date: '2027-01-10',
      });
    });

    expect(post).toHaveBeenCalledWith('/assets/asset-1/service', {
      service_type: 'maintenance',
      service_date: '2026-10-10',
      description: 'Oil and filter change',
      next_service_date: '2027-01-10',
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenLastCalledWith('/assets/service-logs');
  });
});
