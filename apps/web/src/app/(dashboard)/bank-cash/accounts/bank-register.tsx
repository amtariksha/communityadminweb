'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, FetchPanel } from '@/components/data-table';
import { Label } from '@/components/ui/label';
import { useBankRegister } from '@/hooks/use-bank-register';
import { ApiError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { lastMonthRanges } from '@/lib/date';
import { formatCurrency } from '@/lib/utils';
import { accountLabel, type BankAccountRow } from '../../bank/bank-types';
import { registerColumns } from './register-columns';
import { RegisterScopeRadio, RegisterSearchForm } from './register-search';
import { filterRows, type RegisterSearch } from './register-filter';

// POST /bank/reconciliation/:lineId/(un)reconcile.
const RECONCILE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);
const SELECT_CLASS = 'flex h-10 w-56 rounded-md border border-input bg-background px-3 py-2 text-sm';

interface Query {
  accountId: string;
  from: string;
  to: string;
  scope: RegisterSearch['scope'];
  q: string;
  searchIn: RegisterSearch['searchIn'];
}

function notAvailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * The bank register (BANK-08, screen BANK-S3, classic): opens empty; pick
 * the period (default this month) and the account, then Fetch Transactions.
 * Each line shows its document, deposit / withdrawal, the running balance
 * and its bank date, with Reconcile / Undo for finance writers.
 */
export function BankRegisterPanel({ accounts }: { accounts: readonly BankAccountRow[] }): ReactNode {
  const [month] = lastMonthRanges(1);
  const [accountId, setAccountId] = useState('');
  // BANK-09: Non reconciled by default; search applies to the fetched period.
  const [scope, setScope] = useState<RegisterSearch['scope']>('unreconciled');
  const [query, setQuery] = useState<Query | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const canReconcile = useMemo(() => RECONCILE_ROLES.has(currentRole() ?? ''), []);
  const register = useBankRegister(query);
  const rows = query ? filterRows(register.data?.rows ?? [], query) : [];
  const missing = notAvailable(register.error);

  const accountPicker = (
    <>
    <RegisterScopeRadio value={scope} onChange={setScope} />
    <div className="space-y-1">
      <Label htmlFor="register-account">Account</Label>
      <select id="register-account" className={SELECT_CLASS} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Select account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{accountLabel(account)}</option>
        ))}
      </select>
    </div>
    </>
  );

  return (
    <div className="space-y-3">
      <RegisterSearchForm
        disabled={query === null}
        onSearch={(q, searchIn) => {
          if (query) setQuery({ ...query, q, searchIn });
          setPage(1);
        }}
      />
      {register.data && (
        <p className="text-sm text-muted-foreground">
          Opening balance {formatCurrency(register.data.opening_balance)} · Closing balance {formatCurrency(register.data.closing_balance)}
        </p>
      )}
      {missing && <p role="alert" className="text-sm text-muted-foreground">The bank register is not available yet on this server.</p>}
      <DataTable
        title="Bank Register"
        columns={registerColumns(canReconcile)}
        rows={rows.slice((page - 1) * pageSize, page * pageSize)}
        rowKey={(row) => row.id}
        total={rows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        loading={register.isLoading}
        error={missing ? null : register.error}
        onRetry={() => void register.refetch()}
        emptyText="No transactions match."
        fetchMode={{
          panel: (
            <FetchPanel
              title="Fetch transactions"
              range="date"
              rangeLabel="Txns Posted"
              initial={{ from: month.start_date, to: month.end_date }}
              requireRange
              busy={register.isFetching}
              extra={accountPicker}
              extraError={() => (accountId ? null : 'Choose an account.')}
              onFetch={(criteria) => {
                setQuery({ accountId, from: criteria.from, to: criteria.to, scope, q: query?.q ?? '', searchIn: query?.searchIn ?? 'any' });
                setPage(1);
              }}
            />
          ),
          fetched: query !== null,
          prompt: 'Choose an account and period, then Fetch Transactions.',
        }}
      />
    </div>
  );
}
