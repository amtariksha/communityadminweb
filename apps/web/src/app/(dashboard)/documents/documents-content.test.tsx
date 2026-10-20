import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DocumentsContent from './documents-content';

/**
 * FILE-02 — Expiring Soon lists what GET /documents/expiring returns (the
 * API now reads documents.expiry_date), each with an "Expires in N days"
 * badge, rather than the expiring rows of the page on screen.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, variables: undefined });
  const listCalls: Array<Record<string, unknown>> = [];
  const doc = (id: string, title: string) => ({
    id,
    title,
    description: null,
    file_name: `${id}.pdf`,
    file_size: 2048,
    mime_type: 'application/pdf',
    file_url: `https://objects.example.test/society-files/${id}.pdf`,
    created_at: '2026-09-01T00:00:00.000Z',
    uploaded_by_name: id === 'bylaws' ? 'Asha Secretary' : null,
  });
  return { mutation, doc, listCalls };
});

vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));

vi.mock('@/hooks', () => ({
  useDocumentCategories: () => ({ data: [], isLoading: false }),
  useDocuments: (filters: Record<string, unknown>) => {
    mocks.listCalls.push(filters);
    return {
      data: { data: [mocks.doc('bylaws', 'Bylaws'), mocks.doc('lift', 'Lift insurance')], total: 2 },
      isLoading: false,
    };
  },
  // The 10-day policy is not on the page shown; the list must still show it.
  useExpiringDocuments: () => ({
    data: [
      { ...mocks.doc('lift', 'Lift insurance'), expiry_date: '2026-10-29', days_left: 10 },
      { ...mocks.doc('fire', 'Fire NOC'), expiry_date: '2026-10-20', days_left: 1 },
    ],
    isLoading: false,
  }),
  useCreateCategory: mocks.mutation,
  useDeleteDocument: mocks.mutation,
  useUploadDocument: mocks.mutation,
  useUploadFileToS3: mocks.mutation,
}));

vi.mock('../helpdesk/new/use-unit-choices', () => ({
  useUnitChoices: () => ({ data: [] }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest('tr') as HTMLElement;
}

describe('Documents — Expiring Soon', () => {
  it('marks an expiring document on the normal list', () => {
    render(<DocumentsContent />);

    expect(within(rowOf('Lift insurance')).getByText('Expires in 10 days')).toBeTruthy();
    expect(within(rowOf('Bylaws')).getByText('Active')).toBeTruthy();
  });

  it('lists every expiring document, with its badge, when switched on', () => {
    render(<DocumentsContent />);

    fireEvent.click(screen.getByRole('button', { name: /expiring soon/i }));

    expect(screen.queryByText('Bylaws')).toBeNull();
    expect(within(rowOf('Lift insurance')).getByText('Expires in 10 days')).toBeTruthy();
    expect(within(rowOf('Fire NOC')).getByText('Expires in 1 day')).toBeTruthy();
  });
});

describe('Documents — search and Uploaded by (FILE-21)', () => {
  it('sends what is typed as the list search', () => {
    render(<DocumentsContent />);

    fireEvent.change(screen.getByLabelText('Search documents'), { target: { value: ' insurance ' } });

    expect(mocks.listCalls.at(-1)).toMatchObject({ search: 'insurance', page: 1 });
  });

  it('shows who uploaded each document', () => {
    render(<DocumentsContent />);

    expect(screen.getByRole('columnheader', { name: 'Uploaded by' })).toBeTruthy();
    expect(within(rowOf('Bylaws')).getByText('Asha Secretary')).toBeTruthy();
    expect(within(rowOf('Lift insurance')).getByText('—')).toBeTruthy();
  });
});
