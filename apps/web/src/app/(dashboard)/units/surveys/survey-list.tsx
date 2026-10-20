'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { DayRangeFilter, type DayRange } from '@/components/day-range-filter';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useSurveys, surveyParams, type SurveyFilters, type SurveyRow, type SurveyStatus } from '@/hooks/use-surveys';
import { todayIST } from '@/lib/date';
import { isNotDeployed } from '@/lib/not-deployed';
import { AUDIENCE_LABELS, displayStatus, formatDay, STATUS_LABELS, SURVEY_LOGS, surveyRoutes } from './_parts/labels';
import { SURVEYS_UNAVAILABLE, SurveysPage } from './_parts/surveys-page';
import { SurveyRowActions, useSurveyRowHandlers, type SurveyRowHandlers } from './survey-row-actions';

const PAGE_SIZE = 25;
const STATUSES: readonly SurveyStatus[] = ['draft', 'live', 'closed'];

function surveyColumns(today: string, handlers: SurveyRowHandlers): DataTableColumn<SurveyRow>[] {
  return [
    { key: 'title', header: 'Title', cell: (row) => row.title, className: 'font-medium' },
    { key: 'audience', header: 'Who Can Respond', cell: (row) => AUDIENCE_LABELS[row.audience] ?? row.audience },
    { key: 'starts', header: 'Start Date', cell: (row) => formatDay(row.starts_on) },
    { key: 'ends', header: 'End Date', cell: (row) => formatDay(row.ends_on) },
    { key: 'status', header: 'Status', cell: (row) => displayStatus(row, today) },
    { key: 'responses', header: 'Responses', cell: (row) => String(row.response_count) },
    { key: 'action', header: 'Action', cell: (row) => <SurveyRowActions survey={row} handlers={handlers} />, text: () => '' },
  ];
}

function CreateSurvey(): ReactNode {
  return (
    <Link href={surveyRoutes.create} className={buttonVariants()} data-slot="button" data-size="default">
      Create Survey
    </Link>
  );
}

interface FilterPanelProps {
  status: SurveyStatus | '';
  range: DayRange;
  onStatus: (status: SurveyStatus | '') => void;
  onRange: (range: DayRange) => void;
}

/** Filter (UNIT-S14): Status and a date range over the answering window. */
function FilterPanel({ status, range, onStatus, onRange }: FilterPanelProps): ReactNode {
  return (
    <div role="group" aria-label="Filter" className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <Select aria-label="Status" className="w-40" value={status} onChange={(event) => onStatus(event.target.value as SurveyStatus | '')}>
        <option value="">All statuses</option>
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </Select>
      <DayRangeFilter value={range} onChange={onRange} />
      <Button type="button" variant="link" onClick={() => { onStatus(''); onRange({ from: '', to: '' }); }}>
        Clear
      </Button>
    </div>
  );
}

function useSurveyFilters() {
  const [status, setStatus] = useState<SurveyStatus | ''>('');
  const [range, setRange] = useState<DayRange>({ from: '', to: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const filters: SurveyFilters = { status: status || undefined, from: range.from || undefined, to: range.to || undefined, q: q || undefined };
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  return {
    filters,
    status,
    range,
    q,
    page,
    setPage,
    onSearch,
    onStatus: (value: SurveyStatus | '') => { setStatus(value); setPage(1); },
    onRange: (value: DayRange) => { setRange(value); setPage(1); },
  };
}

/**
 * Units & Users › Survey (UNIT-S14): the shared table (S.No · Title ·
 * Who Can Respond · Start Date · End Date · Status · Responses · Action),
 * Filter by status and dates, title search and the export strip.
 */
export function SurveyList(): ReactNode {
  const state = useSurveyFilters();
  const [filterOpen, setFilterOpen] = useState(false);
  const list = useSurveys({ ...state.filters, page: state.page, limit: PAGE_SIZE });
  const handlers = useSurveyRowHandlers();
  const fallbackToday = useMemo(() => todayIST(), []);
  const columns = surveyColumns(list.data?.today ?? fallbackToday, handlers);

  if (list.error && isNotDeployed(list.error)) {
    return (
      <SurveysPage title="Surveys">
        <p className="text-sm text-muted-foreground">{SURVEYS_UNAVAILABLE}</p>
      </SurveysPage>
    );
  }
  const filtered = Boolean(state.filters.status || state.filters.from || state.filters.to || state.filters.q);
  return (
    <SurveysPage title="Surveys" logs={SURVEY_LOGS} standardActions={<CreateSurvey />}>
      {filterOpen && <FilterPanel status={state.status} range={state.range} onStatus={state.onStatus} onRange={state.onRange} />}
      <DataTable<SurveyRow>
        title="Surveys"
        columns={columns}
        rows={list.data?.data ?? []}
        rowKey={(row) => row.id}
        total={list.data?.total ?? 0}
        page={state.page}
        pageSize={PAGE_SIZE}
        pageSizeOptions={[PAGE_SIZE]}
        onPageChange={state.setPage}
        search={{ value: state.q, onChange: state.onSearch, placeholder: 'Search by title' }}
        filters={
          <Button type="button" variant="outline" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
            Filter
          </Button>
        }
        export={{ path: '/surveys/export', params: surveyParams(state.filters), filename: 'surveys' }}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyText={filtered ? 'No surveys match the filter.' : 'No surveys yet — Create Survey.'}
      />
    </SurveysPage>
  );
}
