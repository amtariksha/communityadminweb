import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormResponseDetail, FormResponseRow, ResponseFilters } from '@/hooks/use-form-responses';
import { ResponseDetail } from './[id]/response-detail';
import { ResponsesList } from './responses-list';

/** FORM-06 — the responses queue (FORM-S4) and one response (FORM-S5). */

const state = vi.hoisted(() => ({
  rows: [] as FormResponseRow[],
  filters: [] as ResponseFilters[],
  detail: null as FormResponseDetail | null,
  sign: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), usePathname: () => '/community-forms/responses/unapproved' }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/hooks/use-documents', () => ({ fetchPresignedDownloadUrl: state.sign }));
vi.mock('@/hooks/use-form-responses', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useFormResponses: (filters: ResponseFilters) => {
      state.filters.push(filters);
      return { data: { data: state.rows, total: state.rows.length, counts: { unapproved: 0, approved: 0, rejected: 0 } }, isLoading: false, error: null, refetch: vi.fn() };
    },
    useFormResponse: () => ({ data: state.detail, isLoading: false, error: null }),
    useApproveFormResponse: mutation,
    useRejectFormResponse: mutation,
  };
});

function row(number: string, canAct: boolean): FormResponseRow {
  return {
    id: `id-${number}`,
    response_number: number,
    form_id: 'form-1',
    form_name: 'Parking Sticker Request',
    respondent_name: 'Asha Menon',
    unit_number: '101',
    block: 'A',
    status: 'unapproved',
    submitted_at: '2026-10-20T05:00:00Z',
    decided_at: null,
    rejection_reason: null,
    current_level: 1,
    can_act: canAct,
  };
}

beforeEach(() => {
  state.rows = [];
  state.filters = [];
  state.detail = null;
  state.sign.mockReset().mockResolvedValue('https://signed.example.test/x');
});

describe('Responses queue', () => {
  it('starts on My Approvals Required and asks the server for a level when chosen', () => {
    state.rows = [row('FR-0001', true), row('FR-0002', false)];
    render(<ResponsesList status="unapproved" />);

    expect(state.filters.at(-1)).toMatchObject({ status: 'unapproved', queue: 'mine' });
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Queue'), { target: { value: 'level1' } });
    expect(state.filters.at(-1)).toMatchObject({ queue: 'level1' });
  });

  it('searches by form name on the server', async () => {
    render(<ResponsesList status="approved" />);

    expect(screen.queryByLabelText('Queue')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Parking' } });
    await vi.waitFor(() => expect(state.filters.at(-1)?.q).toBe('Parking'));
  });

  it('says so when there are none', () => {
    render(<ResponsesList status="rejected" />);

    expect(screen.getByText('No responses.')).toBeTruthy();
  });
});

describe('Response detail', () => {
  it('opens a file answer through a signed link, never the stored URL', async () => {
    const stored = 'https://bucket.example.test/tenants/t1/documents/leak.jpg';
    state.detail = {
      ...row('FR-0003', false),
      answers: [{ question_id: 'q1', position: 1, question_text: 'Photo', question_type: 'file_upload', value_text: null, value_number: null, value_date: null, value_options: null, file_urls: [stored], file_names: ['leak.jpg'], acknowledged: null }],
      steps: [{ level: 1, approver_name: 'Ravi Shah', decision: 'pending', decided_by_name: null, decided_at: null, comments: null }],
    };
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { container } = render(<ResponseDetail id="id-FR-0003" />);

    expect(container.innerHTML).not.toContain(stored);
    fireEvent.click(screen.getByRole('button', { name: 'leak.jpg' }));
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith('https://signed.example.test/x', '_blank', 'noopener,noreferrer'));
    expect(state.sign).toHaveBeenCalledWith({ fileUrl: stored, disposition: 'inline', fileName: 'leak.jpg' });
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    open.mockRestore();
  });
});
