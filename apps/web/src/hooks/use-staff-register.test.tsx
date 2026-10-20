import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { registerParams, useStaffRegister } from './use-staff-register';

/** STAFF-42 — the staff lists read GET /staff/register; an older API (404) gives the society staff list instead. */

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
const get = vi.mocked(api.get);

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useStaffRegister', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks the register with the status, search key and page', async () => {
    get.mockResolvedValue({ data: [], total: 0, counts: { active: 0, temp: 0, retired: 0, blacklisted: 0 } });
    const { result } = renderHook(() => useStaffRegister({ status: 'temp', q: 'A101', by: 'unit', page: 2, limit: 25 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/staff/register', { params: { status: 'temp', q: 'A101', by: 'unit', page: '2', limit: '25' } });
    expect(result.current.data?.legacy).toBe(false);
  });

  it('falls back to /staff/employees on a 404, as Official rows, with Unit searched as Any', async () => {
    get.mockImplementation(async (path: string) => {
      if (path === '/staff/register') throw new ApiError(404, { message: 'Not Found' } as never);
      return { data: [{ id: 's1', name: 'Test Guard', staff_type: 'security_guard', phone: '+910000000010', is_active: true, designation: null, join_date: null, exit_date: null }], total: 1 };
    });
    const { result } = renderHook(() => useStaffRegister({ status: 'active', q: 'A101', by: 'unit', page: 1, limit: 25 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenLastCalledWith('/staff/employees', { params: { status: 'active', q: 'A101', page: '1', limit: '25' } });
    expect(result.current.data).toMatchObject({ legacy: true, total: 1, counts: null });
    expect(result.current.data?.data[0]).toMatchObject({ kind: 'official', category_name: 'Security Guard', status: 'active', units: null });
  });

  it('leaves Any and an empty search out of the query', () => {
    expect(registerParams({ status: 'active', by: 'any', q: 'maid' })).toEqual({ status: 'active', q: 'maid' });
    expect(registerParams({ status: 'retired', by: 'phone' })).toEqual({ status: 'retired' });
  });
});
