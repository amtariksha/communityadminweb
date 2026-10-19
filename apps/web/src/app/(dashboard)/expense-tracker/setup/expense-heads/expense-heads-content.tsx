'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import type { LedgerAccount } from '@communityos/shared';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { useFormMode } from '@/components/form-page';
import { PageHeader } from '@/components/layout/page-header';
import { useLedgerAccounts } from '@/hooks/use-ledger';
import { canWriteFinance } from '@/lib/finance-roles';
import { ExpenseHeadForm } from './expense-head-form';

const COLUMNS: DataTableColumn<LedgerAccount>[] = [
  { key: 'code', header: 'Account No.', cell: (row) => row.code, className: 'font-mono text-xs' },
  { key: 'name', header: 'Account Name', cell: (row) => row.name },
  { key: 'hsn', header: 'HSN/SAC', cell: (row) => row.hsn_sac ?? '—', text: (row) => row.hsn_sac ?? '' },
];

/**
 * Expense Tracker › Setup › Expense Heads (EXP-S1): the society's expense
 * ledgers with their HSN/SAC, sorted by account code. Update opens the
 * form as a dialog (standard) or in place of the list (classic, `?edit=`).
 */
export function ExpenseHeadsContent(): ReactNode {
  const mode = useFormMode();
  const router = useRouter();
  const pathname = usePathname();
  const editId = useSearchParams().get('edit') ?? '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [dialogRow, setDialogRow] = useState<LedgerAccount | null>(null);
  const query = useLedgerAccounts({ account_type: 'expense', search: search || undefined, page, limit: pageSize });
  const rows = query.data?.data ?? [];
  const editing = mode === 'page' ? rows.find((row) => row.id === editId) : dialogRow;

  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const open = (row: LedgerAccount) => (mode === 'page' ? router.push(`${pathname}?edit=${row.id}`) : setDialogRow(row));
  const close = () => (mode === 'page' ? router.push(pathname) : setDialogRow(null));
  const actions: DataTableAction<LedgerAccount>[] = canWriteFinance()
    ? [{ key: 'update', header: 'Update', label: 'Update', onClick: open }]
    : [];

  if (mode === 'page' && editing) return <ExpenseHeadForm mode="page" account={editing} onClose={close} />;
  return (
    <div className="space-y-4">
      {mode === 'dialog' && <PageHeader title="Expense heads" />}
      <DataTable<LedgerAccount>
        title="Expense Heads"
        columns={COLUMNS}
        actions={actions}
        rows={rows}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: search, onChange: onSearch, placeholder: 'Code or name' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No expense heads yet — add them in General Ledger › Chart of Accounts."
      />
      {editing && mode === 'dialog' && <ExpenseHeadForm mode="dialog" account={editing} onClose={close} />}
    </div>
  );
}
