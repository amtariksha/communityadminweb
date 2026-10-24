import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { useUploadDocument } from './use-documents';
import { unitPanelKeys } from './use-unit-panel';

/** The unit panel's Documents section shows a document uploaded from it without reopening the panel. */

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));

const input = {
  category_id: 'c1',
  title: 'Sale deed',
  file_url: 'https://objects.example.test/society-files/tenants/t/documents/deed.pdf',
  file_name: 'deed.pdf',
  mime_type: 'application/pdf',
  file_size: 10,
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useUploadDocument(), { wrapper });
  return { result, invalidate };
}

describe('useUploadDocument', () => {
  it("refreshes the unit's panel after a unit document is uploaded", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'd1' } });
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.mutateAsync({ ...input, unit_id: 'unit-1', folder_type: 'unit' });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: unitPanelKeys.panel('unit-1') });
  });

  it('leaves the unit panels alone for a society-wide document', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'd2' } });
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.mutateAsync({ ...input, unit_id: null });
    });
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: expect.arrayContaining(['panel']) }));
  });
});
