'use client';

import { useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import {
  unitDuesParams,
  useUnitDues,
  type UnitDuesFilters,
  type UnitDuesRow,
  type UnitDuesSearchField,
  type UnitLedgerScope,
} from '@/hooks/use-unit-ledger';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency } from '@/lib/utils';
import { DUES_STATUS_LABELS, DuesStatusBadge } from './dues-status';
import { DuesSearch } from './dues-search';

const COLUMNS: DataTableColumn<UnitDuesRow>[] = [
  { key: 'contact', header: 'Primary Contact', cell: (row) => row.primary_contact_name ?? '' },
  { key: 'billing', header: 'Billing Name', cell: (row) => row.billing_name ?? '' },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => <DuesStatusBadge status={row.status} />,
    text: (row) => DUES_STATUS_LABELS[row.status],
  },
  {
    key: 'due',
    header: 'Due',
    cell: (row) => formatCurrency(Number(row.due)),
    className: 'text-right tabular-nums',
  },
];

interface MemberIncomeTableProps {
  /** Member Income lists maintenance dues; Utility Income (UTIL-08) utility dues. */
  scope: Exclude<UnitLedgerScope, 'all'>;
  title: string;
  /** Row buttons as labelled columns (SB-04): View, Invoice, Collection, Print. */
  rowActions: readonly DataTableAction<UnitDuesRow>[];
  exportFilename: string;
  /**
   * Classic arrangement (INC-35): no rows load until a block link or a
   * search is used. The defaulter count is the society's until then.
   */
  opensEmpty?: boolean;
  /** Utility Income lists only the units billed for utilities (UTIL-08). */
  trackedOnly?: boolean;
}

const CHOOSE_PROMPT = 'Choose a block above, or search, to list the units.';

function emptyText(filters: UnitDuesFilters): string {
  if (filters.q) return `No units match '${filters.q}'.`;
  return filters.block ? 'No units in this block.' : 'No units yet.';
}

/**
 * The unit dues workbench (INC-S16): block links, a search on the chosen
 * field, then every unit with its primary contact, billing name, status
 * and what it owes, with the row buttons the page passes in.
 */
export function MemberIncomeTable(props: MemberIncomeTableProps): ReactNode {
  const { scope, title, rowActions, exportFilename, opensEmpty = false, trackedOnly = false } = props;
  const [filters, setFilters] = useState<UnitDuesFilters>({
    block: null,
    q: '',
    q_field: 'any',
    scope,
    tracked_only: trackedOnly,
    page: 1,
    limit: 25,
  });
  const [chosen, setChosen] = useState(!opensEmpty);
  // Before the first choice, one row of the whole society gives its defaulter count.
  const overview = useUnitDues({ ...filters, block: null, q: '', page: 1, limit: 1 }, { enabled: !chosen });
  const query = useUnitDues(filters, { enabled: chosen });
  const update = (patch: Partial<UnitDuesFilters>): void => {
    setChosen(true);
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  };
  const defaulters = (chosen ? query.data : overview.data)?.defaulter_count ?? 0;

  if (isNotDeployed(query.error) || isNotDeployed(overview.error)) {
    return <p className="text-sm text-muted-foreground">{title} is not available yet on this server.</p>;
  }
  return (
    <div className="space-y-3">
      <UnitBlockLinks value={chosen ? filters.block : undefined} onChange={(block) => update({ block })} />
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="font-medium">{chosen ? `Residents under ${filters.block ?? 'All Blocks'}` : ''}</p>
        <p className="font-medium">Total Number of Defaulters : {defaulters}</p>
      </div>
      <DuesSearch
        value={filters.q}
        field={filters.q_field}
        onSearch={(q: string, q_field: UnitDuesSearchField) => update({ q, q_field })}
      />
      <DataTable
        title={title}
        columns={COLUMNS}
        actions={rowActions}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.unit_id}
        total={query.data?.total ?? 0}
        page={filters.page}
        pageSize={filters.limit}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        onPageSizeChange={(limit) => update({ limit })}
        export={{ path: '/unit-ledger/units/export', params: unitDuesParams(filters, { paged: false }), filename: exportFilename }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={emptyText(filters)}
        fetchMode={opensEmpty ? { panel: null, fetched: chosen, prompt: CHOOSE_PROMPT } : undefined}
      />
    </div>
  );
}
