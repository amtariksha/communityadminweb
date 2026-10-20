import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityFormDetail, FormFilters } from '@/hooks/use-community-forms';
import { FormBuilder } from '../_builder/form-builder';
import { addQuestion, emptyDraft, moveQuestion, updateQuestion } from '../_builder/builder-state';
import { FormsList } from '../setup/forms/forms-list';

/** FORM-02 — the form builder (FORM-S3) and Setup Community Form (FORM-S2). */

const state = vi.hoisted(() => ({
  form: null as CommunityFormDetail | null,
  filters: [] as FormFilters[],
  create: vi.fn(),
  publish: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }), usePathname: () => '/community-forms/new' }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-community-forms', () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    useCommunityForm: (id?: string) => ({ data: id ? state.form : undefined, isLoading: false, error: null }),
    useCommunityForms: (filters: FormFilters) => {
      state.filters.push(filters);
      return { data: { data: [], total: 0 }, isLoading: false, error: null, refetch: vi.fn() };
    },
    useCreateCommunityForm: () => ({ mutateAsync: state.create, isPending: false }),
    useUpdateCommunityForm: mutation,
    useReplaceFormQuestions: mutation,
    usePublishCommunityForm: () => ({ mutate: vi.fn(), mutateAsync: state.publish, isPending: false }),
  };
});

function savedForm(extra: Partial<CommunityFormDetail> = {}): CommunityFormDetail {
  return {
    id: 'form-1',
    name: 'Pool Timings Survey',
    description: null,
    audience: 'all',
    requires_approval: true,
    status: 'draft',
    published_at: null,
    created_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
    question_count: 1,
    response_count: 0,
    questions: [{ question_text: 'Which slot?', question_type: 'single_choice', is_mandatory: true, options: ['Morning', 'Evening'], ack_text: null }],
    ...extra,
  };
}

beforeEach(() => {
  state.form = null;
  state.filters = [];
  state.create.mockReset().mockResolvedValue(savedForm());
  state.publish.mockReset().mockResolvedValue(savedForm({ status: 'published' }));
  state.push.mockReset();
});

describe('Form builder', () => {
  it('disables Publish until the confirmation is ticked and a question exists', () => {
    render(<FormBuilder />);
    const publish = () => screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement;

    fireEvent.click(screen.getByLabelText('Yes, I want to publish the form.'));
    expect(publish().disabled).toBe(true);
    expect(screen.getByText('Add at least one question')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    expect(publish().disabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Yes, I want to publish the form.'));
    expect(publish().disabled).toBe(true);
  });

  it('shows option rows with "+" for a choice question and needs two before Publish', async () => {
    render(<FormBuilder />);
    fireEvent.change(screen.getByLabelText('Form name'), { target: { value: 'Pool Timings Survey' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    fireEvent.change(screen.getByLabelText('Question 1 text'), { target: { value: 'Which slot?' } });

    expect(screen.getAllByLabelText(/Option \d/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Add an option' }));
    expect(screen.getAllByLabelText(/Option \d/)).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: 'Morning' } });
    fireEvent.click(screen.getByLabelText('Yes, I want to publish the form.'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByText('Give at least two different answer options')).toBeTruthy();
    expect(state.create).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Option 2'), { target: { value: 'Evening' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await vi.waitFor(() => expect(state.publish).toHaveBeenCalledWith({ id: 'form-1', publish: true }));
    expect(state.create.mock.calls[0][0].questions[0]).toMatchObject({ question_type: 'single_choice', options: ['Morning', 'Evening'] });
  });

  it('asks for the statement of an acknowledgement and drops options of other types', () => {
    render(<FormBuilder />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    fireEvent.change(screen.getByLabelText('Question 1 type'), { target: { value: 'acknowledgement' } });

    expect(screen.queryByLabelText('Option 1')).toBeNull();
    expect(screen.getByLabelText('Question 1 statement')).toBeTruthy();
  });

  it('freezes the questions of a form with responses and says why', () => {
    state.form = savedForm({ status: 'published', response_count: 2 });
    render(<FormBuilder formId="form-1" />);

    expect(screen.getByRole('note').textContent).toMatch(/has responses/);
    expect((screen.getByLabelText('Question 1 text') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: '+ Add question' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    expect((screen.getByLabelText('Form name') as HTMLInputElement).disabled).toBe(false);
  });
});

describe('builder ordering', () => {
  it('moves a question up and down, never past the ends', () => {
    let draft = addQuestion(addQuestion(emptyDraft()));
    draft = updateQuestion(draft, 0, { text: 'First' });
    draft = updateQuestion(draft, 1, { text: 'Second' });

    expect(moveQuestion(draft, 1, -1).questions.map((q) => q.text)).toEqual(['Second', 'First']);
    expect(moveQuestion(draft, 0, -1)).toBe(draft);
    expect(moveQuestion(draft, 1, 1)).toBe(draft);
  });
});

describe('Setup Community Form', () => {
  it('lists Published forms first and asks the server for drafts when Draft is chosen', () => {
    render(<FormsList />);

    expect(state.filters.at(-1)?.status).toBe('published');
    expect(screen.getByText('There are no forms.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'draft' } });
    expect(state.filters.at(-1)?.status).toBe('draft');
  });
});
