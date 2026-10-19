import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadDocumentDialog } from './upload-document-dialog';
import { audienceFields } from './upload-audience';

/**
 * FILE-02 — the upload dialog sends the expiry date, so the document shows
 * under Expiring Soon and the daily job can alert the committee.
 */

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutate: vi.fn(),
  storeFile: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useUploadDocument: () => ({ mutate: mocks.mutate, isPending: false }),
  useUploadFileToS3: () => ({ mutateAsync: mocks.storeFile, isPending: false }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

const CATEGORY = { id: 'cat-1', name: 'Insurance' };
const FILE_URL = 'https://objects.example.test/society-files/t/policy.pdf';

function openAndFill(expiry?: string): void {
  render(
    <UploadDocumentDialog
      categories={[CATEGORY as never]}
      units={[{ id: 'unit-1', unit_number: 'A-101', block: 'A' }]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /upload document/i }));
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Lift insurance' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: CATEGORY.id } });
  if (expiry) {
    fireEvent.change(screen.getByLabelText('Expiry date'), { target: { value: expiry } });
  }
  const file = new File(['%PDF'], 'policy.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } });
  // jsdom cannot see a file set from a test on a required file input, so
  // submit the form itself rather than clicking through its validation.
  fireEvent.submit(screen.getByRole('button', { name: /^upload$/i }).closest('form') as HTMLFormElement);
}

describe('UploadDocumentDialog', () => {
  beforeEach(() => {
    mocks.mutate.mockClear();
    mocks.storeFile.mockReset().mockResolvedValue({ fileUrl: FILE_URL });
  });

  it('sends the expiry date with the uploaded file', async () => {
    openAndFill('2026-11-15');

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.mutate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        title: 'Lift insurance',
        category_id: CATEGORY.id,
        file_url: FILE_URL,
        expiry_date: '2026-11-15',
        folder_type: 'common',
        audience_role: null,
      }),
    );
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('is_private');
  });

  it('leaves the expiry date out when none is picked', async () => {
    openAndFill();

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    expect(mocks.mutate.mock.calls[0][0].expiry_date).toBeUndefined();
  });

  it('does not record a document whose file failed to upload', async () => {
    mocks.storeFile.mockRejectedValue(new Error('network'));

    openAndFill('2026-11-15');

    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Upload failed' })));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});

describe('audienceFields', () => {
  it('files a specific-unit upload under that unit', () => {
    expect(audienceFields('unit', 'unit-1')).toEqual({
      audience_role: null,
      audience_unit_id: 'unit-1',
      unit_id: 'unit-1',
      folder_type: 'unit',
    });
  });

  it('narrows a role upload to that role', () => {
    expect(audienceFields('owner', '')).toEqual(
      expect.objectContaining({ audience_role: 'owner', folder_type: 'common' }),
    );
  });
});
