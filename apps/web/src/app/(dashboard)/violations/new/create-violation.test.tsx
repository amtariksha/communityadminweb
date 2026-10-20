import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { ViolationCategory } from '@/hooks/use-violations';
import { attachmentError } from './attachment-inputs';
import { CreateViolationForm } from './create-violation-form';

/** RULE-05 — Create Violation (RULE-S7). */

const state = vi.hoisted(() => ({
  categories: [] as ViolationCategory[],
  raise: vi.fn(),
  push: vi.fn(),
  layout: 'classic' as 'classic' | 'standard',
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => state.layout }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/unit-search-select', () => ({
  UnitSearchSelect: (props: { value: string; onChange: (id: string) => void }): ReactNode => (
    <input aria-label="Unit" value={props.value} onChange={(event) => props.onChange(event.target.value)} />
  ),
}));
vi.mock('@/hooks/use-units', () => ({ UNIT_PICKER_LIMIT: 1000, useUnits: () => ({ data: { data: [] } }) }));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/use-violations', () => ({
  useViolationCategories: () => ({ data: { data: state.categories, total: state.categories.length }, isLoading: false, error: null }),
}));
vi.mock('@/hooks/use-violation-register', () => ({ useRaiseViolation: () => ({ mutateAsync: state.raise, isPending: false }) }));

const PUBLISHED: ViolationCategory = {
  id: 'cat-1',
  title: 'Gate Entry',
  description: null,
  warning_days: 7,
  penalty_days: 15,
  penalty_amount: '500.00',
  apply_gst: true,
  income_account_id: 'inc-1',
  status: 'published',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

beforeEach(() => {
  state.categories = [];
  state.raise.mockReset();
  state.push.mockReset();
  state.layout = 'classic';
});

function fillIn(): void {
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat-1' } });
  fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'unit-1' } });
  fireEvent.change(screen.getByLabelText('Add Description'), { target: { value: 'Visitor car in the fire lane.' } });
}

describe('Create Violation', () => {
  it('asks for a published category first when there is none', () => {
    render(<CreateViolationForm />);

    expect(screen.getByText(/Publish a category in/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull();
  });

  it('offers five attachment inputs in classic and one picker in standard', () => {
    state.categories = [PUBLISHED];
    const { unmount } = render(<CreateViolationForm />);
    expect(screen.getAllByLabelText(/Attachment \d/)).toHaveLength(5);
    unmount();

    state.layout = 'standard';
    render(<CreateViolationForm />);
    expect(screen.getByLabelText('Attachments')).toBeTruthy();
  });

  it('names the missing fields and sends nothing', () => {
    state.categories = [PUBLISHED];
    render(<CreateViolationForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Pick a category')).toBeTruthy();
    expect(screen.getByText('Add a description')).toBeTruthy();
    expect(state.raise).not.toHaveBeenCalled();
  });

  it('raises a Warning by default and opens the record', async () => {
    state.categories = [PUBLISHED];
    state.raise.mockResolvedValue({ id: 'vio-1', violation_number: 'VIO-0001' });
    render(<CreateViolationForm />);
    fillIn();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await vi.waitFor(() => expect(state.push).toHaveBeenCalledWith('/violations/vio-1'));
    expect(state.raise.mock.calls[0][0]).toMatchObject({ category_id: 'cat-1', unit_id: 'unit-1', requested_stage: 'warning', attachments: [] });
  });

  it('says "Set up approvers first" when nobody can approve', async () => {
    state.categories = [PUBLISHED];
    state.raise.mockRejectedValue(new ApiError(400, { statusCode: 400, error: 'Bad Request', message: 'no approvers', code: 'violation_approvers_missing', request_id: 'r-1', timestamp: '2026-10-20T00:00:00Z' }));
    render(<CreateViolationForm />);
    fillIn();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Set up approvers first.')).toBeTruthy();
  });
});

describe('attachmentError', () => {
  const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

  it('takes up to five JPEG / PNG / WebP / PDF files of 8 MB', () => {
    expect(attachmentError([file('a.jpg'), file('b.pdf')])).toBeNull();
    expect(attachmentError(Array.from({ length: 6 }, (_, i) => file(`${i}.png`)))).toBe('Attach at most 5 files.');
    expect(attachmentError([file('a.exe')])).toBe('Attach JPEG, PNG, WebP or PDF files.');
  });
});
