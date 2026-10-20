import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentFile } from '@/hooks/use-document-files';
import { editPayload, initialEditState } from '../edit/edit-payload';
import { UploadFileForm } from '../upload/upload-file-form';
import { offersPublic } from './public-tick';

/**
 * PROF-42: the Public tick on Downloadable Files' uploads and edits. Off by
 * default (PROF-D5), sent only when ticked, and only for a file every
 * resident reads.
 */
const mocks = vi.hoisted(() => ({ save: vi.fn(), store: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/form-page', () => ({
  FormFrame: ({ children, onSave }: { children: ReactNode; onSave: () => void }) => (
    <form>
      {children}
      <button type="button" onClick={onSave}>
        Upload
      </button>
    </form>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/hooks/use-documents', () => ({
  useDocumentCategories: () => ({ data: [{ id: 'f-downloads', name: 'Downloads' }] }),
  useUploadDocument: () => ({ mutateAsync: mocks.save }),
  useUploadFileToS3: () => ({ mutateAsync: mocks.store }),
  useCreateCategory: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../../helpdesk/new/use-unit-choices', () => ({ useUnitChoices: () => ({ data: [] }) }));

function pickFile(): void {
  const input = document.getElementById('file-input') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['rules'], 'bye-laws.pdf', { type: 'application/pdf' })] } });
}

function renderForm(offerPublic: boolean): void {
  render(<UploadFileForm root="residents" folderId="f-downloads" offerPublic={offerPublic} onClose={vi.fn()} onSaved={vi.fn()} />);
}

describe('Public tick (PROF-42)', () => {
  beforeEach(() => {
    mocks.save.mockReset().mockResolvedValue({});
    mocks.store.mockReset().mockResolvedValue({ fileUrl: 'https://objects.example.test/society-files/tenants/t/documents/x-bye-laws.pdf' });
  });

  it('is offered from Downloadable Files only', () => {
    expect(offersPublic(new URLSearchParams('public=offer'))).toBe(true);
    expect(offersPublic(new URLSearchParams('return=/society-profile/files'))).toBe(true);
    expect(offersPublic(new URLSearchParams('return=/documents/common/residents'))).toBe(false);
  });

  it('leaves an upload members-only unless ticked', async () => {
    renderForm(true);
    pickFile();
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0]).not.toHaveProperty('is_public');
  });

  it('sends is_public when ticked for an all-residents file', async () => {
    renderForm(true);
    pickFile();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Public' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ is_public: true, folder_type: 'common', audience_role: null });
  });

  it('cannot be ticked for owners or tenants only', () => {
    renderForm(true);
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'owner' } });
    expect((screen.getByRole('checkbox', { name: 'Public' }) as HTMLInputElement).disabled).toBe(true);
  });

  it('is not on uploads from Admin Files', () => {
    renderForm(false);
    expect(screen.queryByRole('checkbox', { name: 'Public' })).toBeNull();
  });

  it('an edit sends only a changed tick, and unticks a file leaving all residents', () => {
    const file = {
      id: 'd1', category_id: 'f-downloads', title: 'Bye-laws', description: null, file_url: 'u', file_name: 'b.pdf', file_size: 1,
      mime_type: 'application/pdf', uploaded_by: null, audience_role: null, audience_unit_id: null, folder_type: 'common',
      is_public: true, created_at: '2026-10-01T00:00:00Z',
    } as DocumentFile;
    const state = initialEditState(file);
    expect(state.isPublic).toBe(true);
    expect(editPayload(file, state, 'f-downloads')).toEqual({});
    expect(editPayload(file, { ...state, isPublic: false }, 'f-downloads')).toEqual({ is_public: false });
    expect(editPayload(file, { ...state, audience: 'owner' }, 'f-downloads')).toMatchObject({ audience_role: 'owner', is_public: false });
    const plain = { ...file, is_public: undefined } as DocumentFile;
    expect(editPayload(plain, { ...initialEditState(plain), isPublic: true }, 'f-downloads')).toEqual({ is_public: true });
  });
});
