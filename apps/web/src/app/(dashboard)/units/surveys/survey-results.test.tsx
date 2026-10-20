import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SurveyResults } from '@/hooks/use-surveys';
import { ApiError } from '@/lib/api-error';
import { SurveyResultsView } from './[id]/results/survey-results';

/** UNIT-33 — Survey Results: response count, counts per option, the short answers. */

const state = vi.hoisted(() => ({ result: { data: undefined as SurveyResults | undefined, isLoading: false, error: null as unknown } }));

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Nothing = () => null;
  return { ResponsiveContainer: Pass, BarChart: Pass, Bar: Nothing, XAxis: Nothing, YAxis: Nothing, Tooltip: Nothing };
});
vi.mock('@/hooks/use-surveys', () => ({ useSurveyResults: () => state.result }));

function results(): SurveyResults {
  return {
    response_count: 4,
    survey: {
      id: 'survey-1',
      title: 'Clubhouse Timings',
      description: null,
      audience: 'all_members',
      starts_on: '2026-10-20',
      ends_on: '2026-10-27',
      status: 'closed',
      posted_at: '2026-10-20T04:00:00Z',
      closed_at: '2026-10-27T18:30:00Z',
      created_at: '2026-10-19T04:00:00Z',
      updated_at: '2026-10-27T18:30:00Z',
      question_count: 2,
      response_count: 4,
      questions: [],
    },
    questions: [
      {
        id: 'q-1',
        position: 1,
        type: 'single',
        text: 'Which slot suits you?',
        is_mandatory: true,
        answered: 4,
        options: [
          { id: 'o-1', label: 'Morning', count: 3 },
          { id: 'o-2', label: 'Evening', count: 1 },
        ],
        short_answers: [],
      },
      { id: 'q-2', position: 2, type: 'short', text: 'Anything else?', is_mandatory: false, answered: 2, options: [], short_answers: ['Keep the gym open late', 'More benches'] },
    ],
  };
}

beforeEach(() => {
  state.result = { data: results(), isLoading: false, error: null };
});

describe('Survey Results', () => {
  it('shows the response count and the count of each option', () => {
    render(<SurveyResultsView surveyId="survey-1" />);

    expect(screen.getByTestId('response-count').textContent).toBe('4 responses');
    expect(screen.getByText('Q1. Which slot suits you?')).toBeTruthy();
    const counts = screen.getByRole('list', { name: 'Counts for question 1' });
    expect(within(counts).getByText('Morning')).toBeTruthy();
    expect(screen.getByTestId('count-o-1').textContent).toBe('3 (75%)');
    expect(screen.getByTestId('count-o-2').textContent).toBe('1 (25%)');
  });

  it('lists the short answers of a short-answer question', () => {
    render(<SurveyResultsView surveyId="survey-1" />);

    const answers = screen.getByRole('list', { name: 'Answers to question 2' });
    expect(within(answers).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Keep the gym open late', 'More benches']);
    expect(screen.getByRole('group', { name: 'Export responses' })).toBeTruthy();
  });

  it('says surveys are not available yet on an API without them', () => {
    state.result = { data: undefined, isLoading: false, error: new ApiError(404, { message: 'Cannot GET' } as never) };
    render(<SurveyResultsView surveyId="survey-1" />);

    expect(screen.getByText('Surveys are not available yet.')).toBeTruthy();
  });

  it('says so when the survey does not exist', () => {
    state.result = { data: undefined, isLoading: false, error: new ApiError(404, { message: 'Survey not found', code: 'survey_not_found' } as never) };
    render(<SurveyResultsView surveyId="survey-1" />);

    expect(screen.getByText('Survey not found.')).toBeTruthy();
  });
});
