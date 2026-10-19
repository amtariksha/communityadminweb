'use client';

import { useState, type ReactNode } from 'react';
import {
  DataTable,
  FetchPanel,
  useFetchCriteria,
  type DataTableColumn,
  type FetchCriteria,
  type FetchRangeKind,
} from '@/components/data-table';
import {
  REGISTER_PATHS,
  registerFiltersIgnored,
  useIncomeRegister,
  type RegisterKind,
} from '@/hooks/use-income-registers';
import { isNotDeployed } from '@/lib/not-deployed';

/** The list's names for a box's range: dates by the document date, numbers by the numeric part. */
const RANGE_PARAMS: Record<FetchRangeKind, { from: string; to: string }> = {
  date: { from: 'start_date', to: 'end_date' },
  number: { from: 'from_number', to: 'to_number' },
};

/** Query of one fetch box (INC-36): its fixed parameters, the range typed and the extras chosen at Fetch. */
export function registerBoxParams(
  range: FetchRangeKind,
  criteria: FetchCriteria,
  fixed: Record<string, string>,
  extras: Record<string, string> = {},
): Record<string, string> {
  const names = RANGE_PARAMS[range];
  const params: Record<string, string> = { ...fixed, ...extras };
  if (criteria.from.trim()) params[names.from] = criteria.from.trim();
  if (criteria.to.trim()) params[names.to] = criteria.to.trim();
  return params;
}

export interface RegisterBoxExtra {
  /** Controls shown in the panel before Fetch (e.g. an income account). */
  node: ReactNode;
  /** Their current values as query parameters; read when Fetch is pressed. */
  params: Record<string, string>;
  /** A reason not to fetch yet, e.g. "Choose an income account." */
  error?: string | null;
}

export interface RegisterBoxProps<Row> {
  kind: RegisterKind;
  title: string;
  range: FetchRangeKind;
  rangeLabel?: string;
  requireRange?: boolean;
  /** Parameters every fetch of this box carries, e.g. `{ voided: 'true' }`. */
  fixed: Record<string, string>;
  extra?: RegisterBoxExtra;
  columns: readonly DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  filename: string;
  emptyText: string;
}

function Notice({ children }: { children: ReactNode }): ReactNode {
  return <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{children}</p>;
}

/**
 * One fetch box of a classic register (SB-09 on SB-04): opens empty, loads
 * only its own query on Fetch, and exports the whole fetched result.
 */
export function RegisterBox<Row extends object>(props: RegisterBoxProps<Row>): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [extraError, setExtraError] = useState<string | null>(null);
  const { criteria, fetch } = useFetchCriteria(() => setPage(1));
  const filters = criteria ? registerBoxParams(props.range, criteria, props.fixed, extras) : {};
  const query = useIncomeRegister<Row>(
    props.kind,
    { ...filters, page: String(page), limit: String(pageSize) },
    criteria !== null,
  );
  const rows = query.data?.data ?? [];

  function onFetch(next: FetchCriteria): void {
    const problem = props.extra?.error ?? null;
    setExtraError(problem);
    if (problem) return;
    setExtras(props.extra?.params ?? {});
    fetch(next);
  }

  const panel = (
    <div className="space-y-2">
      <FetchPanel
        title={props.title}
        range={props.range}
        rangeLabel={props.rangeLabel}
        requireRange={props.requireRange}
        extra={props.extra?.node}
        busy={query.isFetching}
        onFetch={onFetch}
      />
      {extraError && (
        <p role="alert" className="text-sm text-destructive">
          {extraError}
        </p>
      )}
    </div>
  );

  if (isNotDeployed(query.error)) {
    return (
      <RegisterSection title={props.title}>
        {panel}
        <Notice>This register is not available yet on this server.</Notice>
      </RegisterSection>
    );
  }
  if (registerFiltersIgnored(props.kind, rows as object[])) {
    return (
      <RegisterSection title={props.title}>
        {panel}
        <Notice>These filters need the latest server update; nothing is listed until it is deployed.</Notice>
      </RegisterSection>
    );
  }

  return (
    <RegisterSection title={props.title}>
      <DataTable<Row>
        title={props.title}
        columns={props.columns}
        rows={rows}
        rowKey={props.rowKey}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        export={{ path: REGISTER_PATHS[props.kind].export, params: filters, filename: props.filename }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={props.emptyText}
        fetchMode={{ panel, fetched: criteria !== null }}
      />
    </RegisterSection>
  );
}

function RegisterSection({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section aria-label={title} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
