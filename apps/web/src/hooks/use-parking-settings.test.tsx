import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useAdditionalFieldLabel, useParkingSettings } from './use-parking-settings';

/** PARK-10 — Parking Setup is read from GET /tenant-settings/parking; an older API (404) reads as "not available". */

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
const get = vi.mocked(api.get);

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useParkingSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unwraps the settings and gives the extra field its label', async () => {
    get.mockResolvedValue({ data: { residents_can_add_vehicle: false, residents_can_edit_vehicle: true, vehicle_additional_field_label: 'Fastag ' } });
    const { result } = renderHook(() => ({ settings: useParkingSettings(), label: useAdditionalFieldLabel() }), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.settings.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/tenant-settings/parking');
    expect(result.current.settings.data?.residents_can_add_vehicle).toBe(false);
    expect(result.current.label).toBe('Fastag');
  });

  it('reads a 404 as not available yet, and the label as blank', async () => {
    get.mockRejectedValue(new ApiError(404, { message: 'Not Found' } as never));
    const { result } = renderHook(() => ({ settings: useParkingSettings(), label: useAdditionalFieldLabel() }), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.settings.isSuccess).toBe(true));
    expect(result.current.settings.data).toBeNull();
    expect(result.current.label).toBe('');
  });
});
