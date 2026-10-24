import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { useCreateReceipt } from './use-receipts';
import { useUnitDues, type UnitDuesFilters } from './use-unit-ledger';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

function withQueryClient(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const filters = { scope: 'member', page: 1, limit: 50, q_field: 'unit' } as unknown as UnitDuesFilters;

describe('useCreateReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [], total: 0 });
    post.mockResolvedValue({ data: { id: 'r-1' } });
  });

  // A collection posted from the standard dialog left Member Income's dues
  // list showing the old balance until the page was reloaded.
  it('refreshes the members’ dues list after a collection', async () => {
    const { result } = renderHook(() => ({ dues: useUnitDues(filters), create: useCreateReceipt() }), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.dues.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.create.mutateAsync({ unit_id: 'u-1', amount: 500, mode: 'cash', receipt_date: '2026-10-20' } as never);
    });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get.mock.calls[1][0]).toBe('/unit-ledger/units');
  });
});
