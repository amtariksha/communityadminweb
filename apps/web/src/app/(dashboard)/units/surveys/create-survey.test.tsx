import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SurveyDetail } from '@/hooks/use-surveys';
import { ApiError } from '@/lib/api-error';
import { addDays, todayIST } from '@/lib/date';
import { SurveyBuilder } from './_builder/survey-builder';
import { addQuestion, emptySurvey, removeQuestion, updateQuestion } from './_builder/survey-draft';

/** UNIT-33 — Create Survey / Edit Survey (UNIT-S15). */

const state = vi.hoisted(() => ({
  survey: null as SurveyDetail | null,
  create: vi.fn(),
  update: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push, replace: state.replace }), usePathname: () => '/units/surveys/new' }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-surveys', () => ({
  useSurvey: (id?: string) => ({ data: id ? state.survey ?? undefined : undefined, isLoading: false, error: null }),
  useCreateSurvey: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateSurvey: () => ({ mutateAsync: state.update, isPending: false }),
  usePostSurvey: () => ({ mutateAsync: state.post, isPending: false }),
}));

const TODAY = todayIST();
const END = addDays(TODAY, 7);

function saved(extra: Partial<SurveyDetail> = {}): SurveyDetail {
  return {
    id: 'survey-1',
    title: 'Clubhouse Timings',
    description: null,
    audience: 'owners_only',
    starts_on: TODAY,
    ends_on: END,
    status: 'draft',
    posted_at: null,
    closed_at: null,
    created_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
    question_count: 1,
    response_count: 0,
    questions: [
      { id: 'q-1', position: 1, type: 'single', text: 'Which slot suits you?', is_mandatory: true, options: [{ id: 'o-1', position: 1, label: 'Morning' }, { id: 'o-2', position: 2, label: 'Evening' }] },
    ],
    ...extra,
  };
}

const postButton = () => screen.getByRole('button', { name: 'Post' }) as HTMLButtonElement;
const tick = () => fireEvent.click(screen.getByLabelText('Yes, I want to publish this survey.'));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValidSurvey(): void {
  type('Title', 'Clubhouse Timings');
  type('Start date', TODAY);
  type('End date', END);
  fireEvent.change(screen.getByLabelText('Who can respond'), { target: { value: 'owners_only' } });
  type('Question 1 text', 'Which slot suits you?');
  fireEvent.click(screen.getByLabelText('Mandatory'));
  type('Question 1 option 1', 'Morning');
  type('Question 1 option 2', 'Evening');
}

beforeEach(() => {
  state.survey = null;
  state.create.mockReset().mockResolvedValue(saved());
  state.update.mockReset().mockResolvedValue(saved());
  state.post.mockReset().mockResolvedValue(saved({ status: 'live' }));
  state.push.mockReset();
  state.replace.mockReset();
});

describe('Create Survey', () => {
  it('keeps Post disabled until "Yes, I want to publish this survey." is ticked', () => {
    render(<SurveyBuilder />);
    fillValidSurvey();

    expect(postButton().disabled).toBe(true);
    tick();
    expect(postButton().disabled).toBe(false);
    tick();
    expect(postButton().disabled).toBe(true);
    expect(state.create).not.toHaveBeenCalled();
  });

  it('posts the survey in the shape the API takes, then publishes it with the confirmation', async () => {
    render(<SurveyBuilder />);
    fillValidSurvey();
    fireEvent.click(screen.getByRole('button', { name: 'Add Questions' }));
    fireEvent.change(screen.getByLabelText('Question 2 type'), { target: { value: 'short' } });
    type('Question 2 text', 'Anything else?');
    tick();
    fireEvent.click(postButton());

    await vi.waitFor(() => expect(state.post).toHaveBeenCalledWith('survey-1'));
    expect(state.create).toHaveBeenCalledWith({
      title: 'Clubhouse Timings',
      description: null,
      audience: 'owners_only',
      starts_on: TODAY,
      ends_on: END,
      questions: [
        { type: 'single', text: 'Which slot suits you?', is_mandatory: true, options: ['Morning', 'Evening'] },
        { type: 'short', text: 'Anything else?', is_mandatory: false, options: [] },
      ],
    });
    expect(state.push).toHaveBeenCalledWith('/units/surveys');
  });

  it('refuses a Post without dates or with one answer option, before calling the API', () => {
    render(<SurveyBuilder />);
    type('Title', 'Clubhouse Timings');
    type('Question 1 text', 'Which slot suits you?');
    type('Question 1 option 1', 'Morning');
    tick();
    fireEvent.click(postButton());

    expect(screen.getByText('Set the start date')).toBeTruthy();
    expect(screen.getByText('Set the end date')).toBeTruthy();
    expect(screen.getByText('Give 2 to 20 different answer options')).toBeTruthy();
    expect(state.create).not.toHaveBeenCalled();
  });

  it('saves a draft without dates and leaves blank options out', async () => {
    render(<SurveyBuilder />);
    type('Title', 'Clubhouse Timings');
    type('Question 1 text', 'Which slot suits you?');
    type('Question 1 option 1', 'Morning');
    fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await vi.waitFor(() => expect(state.replace).toHaveBeenCalledWith('/units/surveys/survey-1/edit'));
    expect(state.create.mock.calls[0][0]).toMatchObject({ starts_on: null, ends_on: null, questions: [{ options: ['Morning'] }] });
    expect(state.post).not.toHaveBeenCalled();
  });

  it('renumbers the questions after one is removed', () => {
    render(<SurveyBuilder />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Questions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Questions' }));
    type('Question 1 text', 'First');
    type('Question 2 text', 'Second');
    type('Question 3 text', 'Third');

    fireEvent.click(screen.getByRole('button', { name: 'Remove question 2' }));

    expect(screen.queryByLabelText('Question 3 text')).toBeNull();
    expect((screen.getByLabelText('Question 1 text') as HTMLInputElement).value).toBe('First');
    expect((screen.getByLabelText('Question 2 text') as HTMLInputElement).value).toBe('Third');
    expect(screen.getByText('Question 2')).toBeTruthy();
  });

  it('shows a refused Post next to the question it is about, and retries on the same draft', async () => {
    state.post.mockRejectedValueOnce(
      new ApiError(400, { statusCode: 400, error: 'Bad Request', message: 'Question 1 needs 2 to 20 different answer options.', code: 'question_options_invalid', details: { position: 1 } } as never),
    );
    render(<SurveyBuilder />);
    fillValidSurvey();
    tick();
    fireEvent.click(postButton());

    expect(await screen.findByText('Question 1 needs 2 to 20 different answer options.')).toBeTruthy();
    fireEvent.click(postButton());
    await vi.waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(state.update.mock.calls[0][0].id).toBe('survey-1');
  });
});

describe('Edit Survey', () => {
  it('loads a draft and saves it with PATCH', async () => {
    state.survey = saved();
    render(<SurveyBuilder surveyId="survey-1" />);

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Clubhouse Timings');
    expect((screen.getByLabelText('Question 1 option 2') as HTMLInputElement).value).toBe('Evening');
    fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
    await vi.waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(state.create).not.toHaveBeenCalled();
  });

  it('does not offer the form for a live or closed survey', () => {
    state.survey = saved({ status: 'closed' });
    render(<SurveyBuilder surveyId="survey-1" />);

    expect(screen.getByRole('note').textContent).toMatch(/closed, so it cannot be edited/);
    expect(screen.queryByRole('button', { name: 'Post' })).toBeNull();
    expect(screen.getByRole('link', { name: 'View Results' }).getAttribute('href')).toBe('/units/surveys/survey-1/results');
  });
});

describe('survey draft', () => {
  it('drops the options of a question turned into a short answer', () => {
    let draft = addQuestion(emptySurvey());
    draft = updateQuestion(draft, 1, { type: 'short' });
    expect(draft.questions[1].options).toEqual([]);
    expect(removeQuestion(draft, 0).questions).toHaveLength(1);
  });
});
