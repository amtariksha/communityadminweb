import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { classicMenu } from '@/components/layout/menu/classic-menu';
import { governingItem, locate } from '@/components/layout/menu/menu-access';
import type { SurveyFilters, SurveyList as SurveyListData, SurveyRow } from '@/hooks/use-surveys';
import { ApiError } from '@/lib/api-error';
import { SurveyList } from './survey-list';

/** UNIT-33 — Units & Users › Survey (UNIT-S14). */

const state = vi.hoisted(() => ({
  list: { data: undefined as SurveyListData | undefined, isLoading: false, error: null as unknown },
  filters: [] as SurveyFilters[],
  close: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/units/surveys' }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/hooks/use-surveys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-surveys')>();
  return {
    surveyParams: actual.surveyParams,
    useSurveys: (filters: SurveyFilters) => {
      state.filters.push(filters);
      return { ...state.list, refetch: vi.fn() };
    },
    useCloseSurvey: () => ({ mutate: state.close, isPending: false }),
    useDeleteSurvey: () => ({ mutate: state.remove, isPending: false }),
  };
});

function row(id: string, status: SurveyRow['status'], startsOn = '2026-10-20'): SurveyRow {
  return {
    id,
    title: `Survey ${id}`,
    description: null,
    audience: 'tenants_only',
    starts_on: startsOn,
    ends_on: '2026-10-30',
    status,
    posted_at: null,
    closed_at: null,
    created_at: '2026-10-19T04:00:00Z',
    updated_at: '2026-10-19T04:00:00Z',
    question_count: 2,
    response_count: status === 'draft' ? 0 : 5,
  };
}

const buttonsIn = (title: string) => {
  const line = screen.getByText(title).closest('tr') as HTMLElement;
  return Array.from(line.querySelectorAll('a, button')).map((element) => element.textContent);
};

beforeEach(() => {
  state.list = {
    data: { data: [row('draft', 'draft'), row('live', 'live'), row('soon', 'live', '2026-11-01'), row('closed', 'closed')], total: 4, today: '2026-10-20' },
    isLoading: false,
    error: null,
  };
  state.filters = [];
  state.close.mockReset();
  state.remove.mockReset();
});

describe('Survey list', () => {
  it('shows the columns in order, with dates as dd/mm/yyyy and a future live survey as Scheduled', () => {
    render(<SurveyList />);

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['S.No', 'Title', 'Who Can Respond', 'Start Date', 'End Date', 'Status', 'Responses', 'Action']);
    const soon = screen.getByText('Survey soon').closest('tr') as HTMLElement;
    expect(within(soon).getByText('Scheduled')).toBeTruthy();
    expect(within(soon).getByText('01/11/2026')).toBeTruthy();
    expect(within(soon).getByText('Tenants Only')).toBeTruthy();
  });

  it('offers only View Results on a closed survey', () => {
    render(<SurveyList />);

    expect(buttonsIn('Survey closed')).toEqual(['View Results']);
    expect(buttonsIn('Survey draft')).toEqual(['Edit', 'View Results', 'Delete']);
    expect(buttonsIn('Survey live')).toEqual(['View Results', 'Close Survey']);
  });

  it('closes a live survey and deletes a draft only after a confirm', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    render(<SurveyList />);
    const live = screen.getByText('Survey live').closest('tr') as HTMLElement;

    fireEvent.click(within(live).getByRole('button', { name: 'Close Survey' }));
    expect(state.close).not.toHaveBeenCalled();
    fireEvent.click(within(live).getByRole('button', { name: 'Close Survey' }));
    expect(state.close.mock.calls[0][0]).toBe('live');

    const draft = screen.getByText('Survey draft').closest('tr') as HTMLElement;
    fireEvent.click(within(draft).getByRole('button', { name: 'Delete' }));
    expect(state.remove.mock.calls[0][0]).toBe('draft');
    confirm.mockRestore();
  });

  it('filters by status and dates from the Filter panel', () => {
    render(<SurveyList />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'live' } });
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });

    expect(state.filters.at(-1)).toMatchObject({ status: 'live', from: '2026-10-01', page: 1 });
  });

  it('says surveys are not available yet on an API without them', () => {
    state.list = { data: undefined, isLoading: false, error: new ApiError(404, { message: 'Cannot GET' } as never) };
    render(<SurveyList />);

    expect(screen.getByText('Surveys are not available yet.')).toBeTruthy();
  });

  it('invites the first survey on an empty list', () => {
    state.list = { data: { data: [], total: 0, today: '2026-10-20' }, isLoading: false, error: null };
    render(<SurveyList />);

    expect(screen.getByText('No surveys yet — Create Survey.')).toBeTruthy();
  });
});

describe('Survey in the menus', () => {
  it('is a Units & Users child with its form pages, gated by the Surveys entry', () => {
    expect(locate('/units/surveys', classicMenu)?.child?.id).toBe('units.survey');
    expect(locate('/units/surveys/new', classicMenu)).toMatchObject({ form: true, child: { label: 'Create Survey' } });
    expect(locate('/units/surveys/s-1/edit', classicMenu)?.child?.label).toBe('Edit Survey');
    expect(locate('/units/surveys/s-1/results', classicMenu)?.child?.label).toBe('Survey Results');
    expect(governingItem('/units/surveys')).toMatchObject({ label: 'Surveys', feature: 'voting' });
  });
});
