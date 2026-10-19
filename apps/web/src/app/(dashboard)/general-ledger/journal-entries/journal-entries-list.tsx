'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, FetchPanel, useFetchCriteria } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { journalEntryParams, useJournalEntries, type JournalEntryRow } from '@/hooks/use-journal-entries';
import { currentRole } from '@/lib/current-role';
import { currentFinancialYear } from '@/lib/date';
import { journalEntryActions, JOURNAL_ENTRY_COLUMNS } from './journal-entry-columns';
import { mayReverse } from './journal-labels';
import { ReverseEntryDialog } from './reverse-entry-dialog';

interface Range {
  from: string;
  to: string;
}

function ShowReversals({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }): ReactNode {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Show Reversals
    </label>
  );
}

function LiveRange({ range, onChange }: { range: Range; onChange: (next: Range) => void }): ReactNode {
  return (
    <>
      {(['from', 'to'] as const).map((end) => (
        <div key={end} className="flex items-center gap-1">
          <Label htmlFor={`je-${end}`}>{end === 'from' ? 'From' : 'To'}</Label>
          <Input id={`je-${end}`} type="date" className="w-40" value={range[end]} onChange={(e) => onChange({ ...range, [end]: e.target.value })} />
        </div>
      ))}
    </>
  );
}

/**
 * Posted journal entries (GL-10, screen GL-S7). `fetch`: the classic
 * register, empty until a date range is fetched (SB-09). `live`: the
 * standard Entries tab with date filters applied as they change. Show
 * Reversals off hides an entry and its reversal as a pair.
 */
export function JournalEntriesList({ mode }: { mode: 'fetch' | 'live' }): ReactNode {
  const year = currentFinancialYear();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [showReversals, setShowReversals] = useState(false);
  const [liveRange, setLiveRange] = useState<Range>({ from: year.start_date, to: year.end_date });
  const [reverseTarget, setReverseTarget] = useState<JournalEntryRow | null>(null);
  const { criteria, fetch } = useFetchCriteria(() => setPage(1));
  const role = useMemo(() => currentRole(), []);

  const range = mode === 'fetch' ? criteria : liveRange;
  const filters = {
    start_date: range?.from || undefined,
    end_date: range?.to || undefined,
    search: search || undefined,
    include_reversals: showReversals,
  };
  const query = useJournalEntries({ ...filters, page, limit: pageSize }, { enabled: range !== null });
  const fromPageOne = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <>
      <DataTable
        title="Journal Entries"
        columns={JOURNAL_ENTRY_COLUMNS}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={fromPageOne(setPageSize)}
        search={{ value: search, onChange: fromPageOne(setSearch), placeholder: 'Entry no. or narration' }}
        filters={
          <>
            {mode === 'live' && <LiveRange range={liveRange} onChange={fromPageOne(setLiveRange)} />}
            <ShowReversals checked={showReversals} onChange={fromPageOne(setShowReversals)} />
          </>
        }
        actions={journalEntryActions({ canReverse: mayReverse(role), onReverse: setReverseTarget })}
        export={{ path: '/ledger/journal-entries/export', params: journalEntryParams(filters), filename: 'journal-entries' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No journal entries in this period"
        fetchMode={
          mode === 'fetch'
            ? {
                panel: (
                  <FetchPanel
                    title="Fetch journal entries"
                    range="date"
                    initial={{ from: year.start_date, to: year.end_date }}
                    requireRange
                    busy={query.isFetching}
                    onFetch={fetch}
                  />
                ),
                fetched: criteria !== null,
                prompt: 'Choose a date range and press Fetch',
              }
            : undefined
        }
      />
      <ReverseEntryDialog entry={reverseTarget} onClose={() => setReverseTarget(null)} />
    </>
  );
}
