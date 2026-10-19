import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentEditForm } from './edit/document-edit-form';
import { editPayload, initialEditState } from './edit/edit-payload';
import type { DocumentFile } from '@/hooks/use-document-files';

/**
 * Edit File (FILE-11, screen FILE-S4): only what changed is sent, a move
 * between the roots carries the folder and audience, a replaced file is
 * sent with its notes, and every version stays listed for download.
 */

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  storeFile: vi.fn(),
  addToast: vi.fn(),
  detail: { data: undefined as unknown },
}));

vi.mock('@/hooks/use-documents', () => ({
  useDocumentCategories: () => ({ data: [{ id: 'f-1', name: 'Minutes' }, { id: 'f-2', name: 'Insurance' }] }),
  useUpdateDocument: () => ({ mutateAsync: mocks.update }),
  useUploadFileToS3: () => ({ mutateAsync: mocks.storeFile }),
  useCreateCategory: () => ({ mutateAsync: vi.fn() }),
  fetchPresignedDownloadUrl: vi.fn(),
}));
vi.mock('@/hooks/use-document-files', () => ({ useDocumentWithVersions: () => mocks.detail }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const FILE: DocumentFile = {
  id: 'doc-1',
  category_id: 'f-1',
  title: 'AGM minutes',
  description: null,
  file_url: 'https://objects.example.test/society-files/t/v1.pdf',
  file_name: 'v1.pdf',
  file_size: 10,
  mime_type: 'application/pdf',
  uploaded_by: 'u-1',
  audience_role: 'committee_member',
  audience_unit_id: null,
  unit_id: null,
  folder_type: 'committee',
  expiry_date: null,
  created_at: '2026-10-01T10:00:00Z',
};

const VERSIONS = [
  { id: 'v2', version_number: 2, file_url: 'u2', file_name: 'v2.pdf', file_size: 20, change_notes: 'Signed copy', uploaded_by_name: 'Asha Test', created_at: '2026-10-05T10:00:00Z' },
  { id: 'v1', version_number: 1, file_url: 'u1', file_name: 'v1.pdf', file_size: 10, change_notes: 'Initial upload', uploaded_by_name: 'Asha Test', created_at: '2026-10-01T10:00:00Z' },
];

describe('editPayload', () => {
  it('sends nothing for an unchanged form', () => {
    expect(editPayload(FILE, initialEditState(FILE), 'f-1')).toEqual({});
  });

  it('sends the folder and audience when moving to Resident Documents', () => {
    const state = { ...initialEditState(FILE), root: 'residents' as const, audience: 'owner' as const };
    expect(editPayload(FILE, state, 'f-1')).toEqual({ folder_type: 'common', audience_role: 'owner' });
  });

  it('clears the expiry date with null and sends a new folder', () => {
    const dated = { ...FILE, expiry_date: '2026-12-01' };
    const state = { ...initialEditState(dated), expiry: '' };
    expect(editPayload(dated, state, 'f-2')).toEqual({ expiry_date: null, category_id: 'f-2' });
  });

  it('sends a replaced file with its change notes', () => {
    const state = { ...initialEditState(FILE), changeNotes: 'Signed copy' };
    const replaced = { file_url: 'u2', file_name: 'v2.pdf', file_size: 20, mime_type: 'application/pdf' };
    expect(editPayload(FILE, state, 'f-1', replaced)).toEqual({ ...replaced, change_notes: 'Signed copy' });
  });
});

describe('DocumentEditForm', () => {
  beforeEach(() => {
    mocks.update.mockReset().mockImplementation(({ data }) => Promise.resolve({ data: { ...FILE, ...data } }));
    mocks.detail = { data: { document: FILE, versions: VERSIONS } };
  });

  it('lists every version, newest first, each downloadable', () => {
    render(<DocumentEditForm mode="page" documentId="doc-1" onClose={vi.fn()} onSaved={vi.fn()} />);

    const table = screen.getByRole('table', { name: 'Versions' });
    const rows = table.querySelectorAll('tbody tr');
    expect([...rows].map((row) => row.firstElementChild?.textContent)).toEqual(['2', '1']);
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
  });

  it('asks before moving an admin file where residents see it, and PATCHes the move', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onSaved = vi.fn();
    render(<DocumentEditForm mode="page" documentId="doc-1" onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Root'), { target: { value: 'residents' } });
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'tenant_resident' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      id: 'doc-1',
      data: { folder_type: 'common', audience_role: 'tenant_resident' },
    });
    expect(mocks.addToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Changes saved' }));
    confirm.mockRestore();
  });

  it('says so when an older API saved the edit but did not move the file', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mocks.update.mockResolvedValue({ data: FILE });
    render(<DocumentEditForm mode="page" documentId="doc-1" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Root'), { target: { value: 'residents' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mocks.addToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Saved, but the file was not moved' })),
    );
    confirm.mockRestore();
  });

  it('keeps the file where it is when the move is not confirmed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<DocumentEditForm mode="page" documentId="doc-1" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Root'), { target: { value: 'residents' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.update).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
