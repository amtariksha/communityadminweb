'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useFormMode } from '@/components/form-page';
import { Button } from '@/components/ui/button';
import { useViolationCategories, type ViolationCategory } from '@/hooks/use-violations';
import { useRouter } from 'next/navigation';
import { isNotDeployed } from '@/lib/not-deployed';
import { CategoryForm } from '../../_parts/category-form';
import { STATUS_LABELS } from '../../_parts/category-form-state';
import { ViolationsPage } from '../../_parts/violations-page';

const BASE = '/violations/setup/categories';
const PAGE_SIZES = [10, 25, 50, 100] as const;

const COLUMNS: readonly DataTableColumn<ViolationCategory>[] = [
  { key: 'title', header: 'Category', cell: (row) => row.title, className: 'font-medium' },
  { key: 'status', header: 'Status', cell: (row) => STATUS_LABELS[row.status] ?? row.status },
];

/** Which category the standard layout's dialog edits ('new' = Create Category). */
type DialogTarget = string | 'new' | null;

/**
 * Rules & Violations Set Up › Category Set Up (RULE-S2): the society's rule
 * categories with their status. Add Category and Edit open the category
 * form as a page in classic and as a dialog in standard (SB-07).
 */
export function CategoriesContent(): ReactNode {
  const mode = useFormMode();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [dialog, setDialog] = useState<DialogTarget>(null);
  const list = useViolationCategories({ q: q || undefined, page, limit: pageSize });
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const open = (target: 'new' | string) => (mode === 'page' ? router.push(target === 'new' ? `${BASE}/new` : `${BASE}/${target}`) : setDialog(target));
  const actions: DataTableAction<ViolationCategory>[] = [{ key: 'edit', header: 'Edit', label: 'Edit', onClick: (row) => open(row.id) }];

  if (list.error && isNotDeployed(list.error)) {
    return (
      <ViolationsPage title="Category Set Up">
        <p className="text-sm text-muted-foreground">Rules & Violations is not available yet.</p>
      </ViolationsPage>
    );
  }

  return (
    <ViolationsPage
      title="Category Set Up"
      logs={['violation_category']}
      actions={
        <Button type="button" onClick={() => open('new')}>
          Add Category
        </Button>
      }
    >
      <DataTable<ViolationCategory>
        title="Category Set Up"
        serialHeader="Sl.No"
        columns={COLUMNS}
        actions={actions}
        rows={list.data?.data ?? []}
        rowKey={(row) => row.id}
        total={list.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: onSearch, placeholder: 'Search:' }}
        export={{ path: '/violations/categories/export', params: q ? { q } : {}, filename: 'violation-categories' }}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyText="There are no records."
      />
      {mode === 'dialog' && dialog !== null && (
        <CategoryForm
          mode="dialog"
          open
          categoryId={dialog === 'new' ? undefined : dialog}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </ViolationsPage>
  );
}
