'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AccountGroup } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { ReportSkeleton } from '@/components/ledger-reports/report-skeleton';
import { useAccountGroups } from '@/hooks';
import { useAllLedgerAccounts } from '@/hooks/use-chart-of-accounts';
import { QUERY_PAGE_SIZE, useLedgerQueryLines, type LedgerQueryLine, type LedgerQueryParams } from '@/hooks/use-ledger-query';
import { currentFinancialYear } from '@/lib/date';
import { formatCurrency, formatDate } from '@/lib/utils';
import { sourceLabel } from '../../journal-entries/journal-labels';

const TYPES: ReadonlyArray<[string, string]> = [['asset', 'Assets'], ['liability', 'Liabilities'], ['equity', 'Equity'], ['income', 'Income'], ['expense', 'Expense']];
const DOCUMENT_LABELS: Readonly<Record<string, string>> = {
  invoice: 'Invoice', receipt: 'Collection', credit_note: 'Credit Note', vendor_bill: 'Vendor Bill',
  vendor_payment: 'Vendor Payment', cheque: 'Cheque', bank_transfer: 'Transfer',
};
const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

interface Draft {
  type: string;
  groupId: string;
  accountId: string;
  from: string;
  to: string;
}

/** The ids of a group and all groups under it. */
function subtree(groups: readonly AccountGroup[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const group of groups) {
      if (group.parent_id && ids.has(group.parent_id) && !ids.has(group.id)) {
        ids.add(group.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function documentText(line: Pick<LedgerQueryLine, 'document_type' | 'document_number' | 'source_type'>): string {
  if (line.document_type) return `${DOCUMENT_LABELS[line.document_type] ?? line.document_type}${line.document_number ? ` ${line.document_number}` : ''}`;
  return sourceLabel(line.source_type ?? '');
}

function LevelPicker({ draft, set, groups }: { draft: Draft; set: (patch: Partial<Draft>) => void; groups: readonly AccountGroup[] }): ReactNode {
  const accounts = useAllLedgerAccounts().data ?? [];
  const typeGroups = groups.filter((group) => group.type === draft.type).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const inGroup = draft.groupId ? subtree(groups, draft.groupId) : null;
  const typeIds = new Set(typeGroups.map((group) => group.id));
  const choices = accounts.filter((account) => (inGroup ? inGroup.has(account.group_id) : typeIds.has(account.group_id)));
  return (
    <>
      <div className="w-40 space-y-1">
        <Label htmlFor="query-type">Level</Label>
        <select id="query-type" className={SELECT_CLASS} value={draft.type} onChange={(e) => set({ type: e.target.value, groupId: '', accountId: '' })}>
          <option value="">Choose…</option>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="w-56 space-y-1">
        <Label htmlFor="query-group">Group</Label>
        <select id="query-group" className={SELECT_CLASS} disabled={!draft.type} value={draft.groupId} onChange={(e) => set({ groupId: e.target.value, accountId: '' })}>
          <option value="">All groups</option>
          {typeGroups.map((group) => <option key={group.id} value={group.id}>{`${'— '.repeat(Math.max(group.level - 1, 0))}${group.name}`}</option>)}
        </select>
      </div>
      <div className="w-56 space-y-1">
        <Label htmlFor="query-account">Account</Label>
        <select id="query-account" className={SELECT_CLASS} disabled={!draft.type} value={draft.accountId} onChange={(e) => set({ accountId: e.target.value })}>
          <option value="">All accounts</option>
          {choices.map((account) => <option key={account.id} value={account.id}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
        </select>
      </div>
    </>
  );
}

function LinesTable({ params, setPage }: { params: LedgerQueryParams; setPage: (page: number) => void }): ReactNode {
  const query = useLedgerQueryLines(params);
  if (query.isLoading) return <ReportSkeleton />;
  if (query.isError) return <p role="alert" className="py-8 text-center text-destructive">The postings could not be loaded.</p>;
  if (query.data === null) return <p role="note" className="py-8 text-center text-muted-foreground">Query by account group is not available yet on this server.</p>;
  const result = query.data!;
  if (result.total === 0) return <p className="py-8 text-center text-muted-foreground">No postings in this period.</p>;
  const first = (params.page - 1) * QUERY_PAGE_SIZE;
  const rows = result.data.map((line, index) => ({ ...line, sl: first + index + 1, document: documentText(line) }));
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          data={rows}
          filename={`ledger-query-${params.from}-to-${params.to}`}
          columns={[
            { key: 'sl', label: 'S.No' }, { key: 'entry_date', label: 'Date' }, { key: 'entry_number', label: 'Entry No.' },
            { key: 'document', label: 'Document' }, { key: 'account_name', label: 'Account' }, { key: 'narration', label: 'Narration' },
            { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' }, { key: 'posted_by_name', label: 'Posted By' },
          ]}
        />
      </div>
      <Table aria-label="Postings">
        <TableHeader>
          <TableRow>
            {['S.No', 'Date', 'Entry No.', 'Document', 'Account', 'Narration', 'Debit', 'Credit', 'Posted By'].map((head) => <TableHead key={head}>{head}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((line) => (
            <TableRow key={line.line_id}>
              <TableCell>{line.sl}</TableCell>
              <TableCell>{formatDate(line.entry_date)}</TableCell>
              <TableCell>
                <Link href={`/general-ledger/journal-entries/${line.entry_id}`} className="text-primary underline">#{line.entry_number}</Link>
                {line.is_reversed && <span className="ml-1 text-xs text-muted-foreground">(reversed)</span>}
                {line.is_reversal && <span className="ml-1 text-xs text-muted-foreground">(reversal)</span>}
              </TableCell>
              <TableCell>{line.document}</TableCell>
              <TableCell>{line.account_name}</TableCell>
              <TableCell className="max-w-xs truncate">{line.narration}</TableCell>
              <TableCell className="text-right">{Number(line.debit) ? formatCurrency(line.debit) : '-'}</TableCell>
              <TableCell className="text-right">{Number(line.credit) ? formatCurrency(line.credit) : '-'}</TableCell>
              <TableCell>{line.posted_by_name ?? 'System'}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={6} className="text-right">{`Total (${result.total} lines)`}</TableCell>
            <TableCell className="text-right">{formatCurrency(result.totals.debit)}</TableCell>
            <TableCell className="text-right">{formatCurrency(result.totals.credit)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      {result.total > QUERY_PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button type="button" variant="outline" size="sm" disabled={params.page === 1} onClick={() => setPage(params.page - 1)}>Previous</Button>
          <span>{`Showing ${first + 1} to ${Math.min(first + QUERY_PAGE_SIZE, result.total)} of ${result.total}`}</span>
          <Button type="button" variant="outline" size="sm" disabled={first + QUERY_PAGE_SIZE >= result.total} onClick={() => setPage(params.page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

/**
 * General Ledger › Query › By Account Group (GL-17, screen GL-S11): every
 * posting to a type, a group (its sub-groups included) or one account in a
 * period. Opened from the trial balance with ?account_id&from&to.
 */
export function QueryByAccountPage(): ReactNode {
  const search = useSearchParams();
  const year = currentFinancialYear();
  const groups = useAccountGroups().data ?? [];
  const linked = search?.get('account_id') ?? '';
  const start: Draft = { type: '', groupId: '', accountId: linked, from: search?.get('from') ?? year.start_date, to: search?.get('to') ?? year.end_date };
  const [draft, setDraft] = useState<Draft>(start);
  const [params, setParams] = useState<LedgerQueryParams | null>(() =>
    linked ? { from: start.from, to: start.to, accountId: linked, page: 1 } : null,
  );
  const set = (patch: Partial<Draft>): void => setDraft((current) => ({ ...current, ...patch }));
  const invalid = draft.from > draft.to || (!draft.type && !draft.accountId);
  const fetchParams = useMemo(
    () => ({ from: draft.from, to: draft.to, accountType: draft.accountId || draft.groupId ? undefined : draft.type, groupId: draft.accountId ? undefined : draft.groupId || undefined, accountId: draft.accountId || undefined }),
    [draft],
  );

  function fetchDocuments(event: FormEvent): void {
    event.preventDefault();
    if (!invalid) setParams({ ...fetchParams, page: 1 });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form aria-label="Query by account group" className="flex flex-wrap items-end gap-3" onSubmit={fetchDocuments}>
            {(['from', 'to'] as const).map((end) => (
              <div key={end} className="space-y-1">
                <Label htmlFor={`query-${end}`}>{end === 'from' ? 'From' : 'To'}</Label>
                <Input id={`query-${end}`} type="date" className="w-44" required value={draft[end]} onChange={(e) => set({ [end]: e.target.value })} />
              </div>
            ))}
            <LevelPicker draft={draft} set={set} groups={groups} />
            <Button type="submit" disabled={invalid}>Fetch Documents</Button>
          </form>
          {draft.from > draft.to && <p role="alert" className="mt-2 text-sm text-destructive">The from date is after the to date.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {params ? (
            <LinesTable params={params} setPage={(page) => setParams({ ...params, page })} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">Choose a period and a level, then Fetch Documents.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
