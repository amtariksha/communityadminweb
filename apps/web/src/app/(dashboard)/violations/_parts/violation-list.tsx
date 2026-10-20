'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { Select } from '@/components/ui/select';
import { useBlocks } from '@/hooks/use-units';
import { useViolationCategories } from '@/hooks/use-violations';
import { useViolations, violationParams, type Violation, type ViolationFilters } from '@/hooks/use-violation-register';
import { isNotDeployed } from '@/lib/not-deployed';
import { useViolationDecisions } from './decision-dialogs';
import { violationColumns, type ViolationListKind } from './stage-columns';

export interface ViolationListProps {
  kind: ViolationListKind;
  title: string;
  emptyText: string;
  /** Filters of this list beside search, category and block (e.g. Paid / Unpaid). */
  extraFilters?: ReactNode;
  extra?: Omit<ViolationFilters, 'status' | 'q' | 'category_id' | 'block' | 'page' | 'limit'>;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

function useListFilters() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [categoryId, setCategoryId] = useState('');
  const [block, setBlock] = useState('');
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  return { q, page, setPage, pageSize, setPageSize, categoryId, setCategoryId, block, setBlock, onSearch };
}

function FilterSelects(props: { categoryId: string; block: string; onCategory: (id: string) => void; onBlock: (block: string) => void }): ReactNode {
  const categories = useViolationCategories({ limit: 100 }).data?.data ?? [];
  const blocks = useBlocks().data ?? [];
  return (
    <>
      <Select aria-label="Category" className="w-48" value={props.categoryId} onChange={(event) => props.onCategory(event.target.value)}>
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.title}
          </option>
        ))}
      </Select>
      {blocks.length > 0 && (
        <Select aria-label="Block" className="w-36" value={props.block} onChange={(event) => props.onBlock(event.target.value)}>
          <option value="">All blocks</option>
          {blocks.map((block) => (
            <option key={block} value={block}>
              {block}
            </option>
          ))}
        </Select>
      )}
    </>
  );
}

/**
 * One list of the register (SB-04, status from the route — SB-05): Open
 * Violations' Awaiting Approval, Warning and Penalty, and Closed Violations.
 * Approve and Reject columns appear only for a viewer with a pending step.
 */
export function ViolationList({ kind, title, emptyText, extraFilters, extra }: ViolationListProps): ReactNode {
  const f = useListFilters();
  const filters: ViolationFilters = { status: kind, q: f.q || undefined, category_id: f.categoryId || undefined, block: f.block || undefined, ...extra };
  const list = useViolations({ ...filters, page: f.page, limit: f.pageSize });
  const decisions = useViolationDecisions();
  const rows = list.data?.data ?? [];
  const anyCanAct = rows.some((row) => row.can_act);
  const actions = useMemo(() => {
    const view: DataTableAction<Violation> = { key: 'view', header: 'View', label: 'View', href: (row) => `/violations/${row.id}` };
    if (kind !== 'awaiting_approval' || !anyCanAct) return [view];
    return [
      view,
      { key: 'approve', header: 'Approve', label: 'Approve', onClick: decisions.askApprove, hidden: (row: Violation) => !row.can_act },
      { key: 'reject', header: 'Reject', label: 'Reject', onClick: decisions.askReject, hidden: (row: Violation) => !row.can_act },
    ];
  }, [kind, anyCanAct, decisions.askApprove, decisions.askReject]);

  if (list.error && isNotDeployed(list.error)) {
    return <p className="text-sm text-muted-foreground">Rules & Violations is not available yet.</p>;
  }
  return (
    <>
      <DataTable<Violation>
        title={title}
        serialHeader="Sl.No"
        columns={violationColumns(kind)}
        actions={actions}
        rows={rows}
        rowKey={(row) => row.id}
        total={list.data?.total ?? 0}
        page={f.page}
        pageSize={f.pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={f.setPage}
        onPageSizeChange={(size) => {
          f.setPageSize(size);
          f.setPage(1);
        }}
        search={{ value: f.q, onChange: f.onSearch, placeholder: 'Violation no., unit or category' }}
        filters={
          <>
            <FilterSelects categoryId={f.categoryId} block={f.block} onCategory={f.setCategoryId} onBlock={f.setBlock} />
            {extraFilters}
          </>
        }
        export={{ path: '/violations/export', params: violationParams(filters), filename: `violations-${kind.replace('_', '-')}` }}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyText={emptyText}
      />
      {decisions.dialogs}
    </>
  );
}
