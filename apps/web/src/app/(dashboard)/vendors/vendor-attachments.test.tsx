import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { vendorFileProblem } from '@/hooks/use-vendor-attachments';
import { VendorAttachments } from './vendor-attachments';

/**
 * Vendor Attachments (VEND-08): the files on a vendor with Download and
 * Remove, a picker that uploads and records each file, at most five, and a
 * plain "not available yet" on an API without the route.
 */

const toast = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => toast }));

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  attach: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: mocks.upload }) }));
vi.mock('@/hooks/use-vendor-attachments', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/hooks/use-vendor-attachments')>();
  return {
    ...real,
    useVendorAttachments: () => mocks.list(),
    useAddVendorAttachment: () => ({ mutateAsync: mocks.attach }),
    useRemoveVendorAttachment: () => ({ mutate: mocks.remove, isPending: false }),
  };
});

const stored = (n: number) => ({
  id: `a-${n}`,
  file_key: `tenants/t/documents/f${n}.pdf`,
  file_name: `f${n}.pdf`,
  mime_type: 'application/pdf',
  size_bytes: 2048,
  created_at: '2026-10-19T10:00:00Z',
  uploaded_by_name: 'Treasurer Test',
});

describe('VendorAttachments', () => {
  beforeEach(() => {
    toast.addToast.mockReset();
    mocks.list.mockReset().mockReturnValue({ data: [stored(1)], error: null });
    mocks.upload.mockReset().mockResolvedValue({ key: 'tenants/t/documents/new.pdf', fileUrl: 'https://x/new.pdf' });
    mocks.attach.mockReset().mockResolvedValue({ data: [] });
    mocks.remove.mockReset();
  });

  it('lists the files and removes one', () => {
    render(<VendorAttachments vendorId="v-1" />);
    expect(screen.getByText('f1.pdf')).toBeTruthy();
    expect(screen.getByText(/1 of 5 used/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove f1.pdf' }));
    expect(mocks.remove).toHaveBeenCalledWith('a-1', expect.anything());
  });

  it('uploads a picked file and records it on the vendor', async () => {
    render(<VendorAttachments vendorId="v-1" />);
    const file = new File(['%PDF'], 'agreement.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Vendor Attachments'), { target: { files: [file] } });
    await waitFor(() =>
      expect(mocks.attach).toHaveBeenCalledWith({
        file_key: 'tenants/t/documents/new.pdf',
        file_name: 'agreement.pdf',
        mime_type: 'application/pdf',
        size_bytes: file.size,
      }),
    );
  });

  it('offers no picker once five files are held', () => {
    mocks.list.mockReturnValue({ data: [1, 2, 3, 4, 5].map(stored), error: null });
    render(<VendorAttachments vendorId="v-1" />);
    expect(screen.queryByLabelText('Vendor Attachments')).toBeNull();
    expect(vendorFileProblem({ name: 'six.pdf', type: 'application/pdf', size: 10 }, 5)).toBe('A vendor can hold five files');
    expect(vendorFileProblem({ name: 'big.pdf', type: 'application/pdf', size: 6 * 1024 * 1024 }, 0)).toMatch(/5 MB/);
    expect(vendorFileProblem({ name: 'a.docx', type: 'application/msword', size: 10 }, 0)).toMatch(/PDF, JPEG or PNG/);
  });

  it('says not available yet when the API has no route', () => {
    mocks.list.mockReturnValue({ data: undefined, error: new ApiError(404, { message: 'Cannot GET' } as never) });
    render(<VendorAttachments vendorId="v-1" />);
    expect(screen.getByText('Vendor attachments are not available yet.')).toBeTruthy();
  });

  it('waits for a saved vendor', () => {
    render(<VendorAttachments />);
    expect(screen.getByText('Files can be attached once the vendor is saved.')).toBeTruthy();
  });
});
