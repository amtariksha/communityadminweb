import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEW_FOLDER, folderError, useResolveFolder } from './folder-field';

/** "New folder…" on Upload File (FILE-S3): a folder made from a root belongs to it (FILE-20). */

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/hooks/use-documents', () => ({ useCreateCategory: () => ({ mutateAsync: mocks.create }) }));

describe('useResolveFolder', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ data: { id: 'f-new' } });
  });

  it('creates the new folder in the root the upload was opened from', async () => {
    const { result } = renderHook(() => useResolveFolder('admin'));
    await expect(result.current(NEW_FOLDER, ' Minutes ')).resolves.toBe('f-new');
    expect(mocks.create).toHaveBeenCalledWith({ name: 'Minutes', root: 'admin' });
  });

  it('creates a folder in both roots from a unit upload, and keeps a chosen folder', async () => {
    const { result } = renderHook(() => useResolveFolder());
    await result.current(NEW_FOLDER, 'Flat papers');
    expect(mocks.create).toHaveBeenCalledWith({ name: 'Flat papers' });
    await expect(result.current('f-1', '')).resolves.toBe('f-1');
  });

  it('refuses a name already in the list, whatever the case', () => {
    expect(folderError([{ id: 'f-1', name: 'Minutes' }], NEW_FOLDER, 'minutes')).toMatch(/already exists/);
  });
});
