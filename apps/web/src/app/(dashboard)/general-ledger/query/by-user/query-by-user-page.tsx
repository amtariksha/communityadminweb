'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { ReportSkeleton } from '@/components/ledger-reports/report-skeleton';
import { useJournalEntriesByUser, useJournalPosters, type ByUserParams } from '@/hooks/use-ledger-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { sourceLabel, statusLabel } from '../../journal-entries/journal-labels';

const DOCUMENT_TYPES: ReadonlyArray<[ByUserParams['documentType'], string]> = [
  ['all', 'All'],
  ['invoices_credit_notes', 'Invoices & Credit Notes'],
  ['collections', 'Collections'],
  ['vendor_bills_payments', 'Vendor Bills & Payments'],
  ['journal_entries', 'Journal Entries'],
];
const SELECT_CLASS = 'flex h-10 w-56 rounded-md border border-input bg-background px-3 text-sm';

function problem(draft: ByUserParams): string | null {
  if (!Number.isInteger(draft.count) || draft.count < 1 || draft.count > 500) return 'No. of transactions is 1 to 500.';
  if (!Number.isInteger(draft.startingFrom) || draft.startingFrom < 1) return 'Starting from is 1 or more.';
  if (draft.createdFrom && draft.createdTo && draft.createdFrom > draft.createdTo) return 'Entered on: From is after To.';
  if (draft.from && draft.to && draft.from > draft.to) return 'Transaction date: From is after To.';
  return null;
}

function DateRange({ label, from, to, onChange }: { label: string; from: string; to: string; onChange: (from: string, to: string) => void }): ReactNode {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <fieldset className="flex items-end gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="space-y-1">
        <Label htmlFor={`${id}-from`}>{`${label} from`}</Label>
        <Input id={`${id}-from`} type="date" className="w-40" value={from} onChange={(e) => onChange(e.target.value, to)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-to`}>{`${label} to`}</Label>
        <Input id={`${id}-to`} type="date" className="w-40" value={to} onChange={(e) => onChange(from, e.target.value)} />
      </div>
    </fieldset>
  );
}

function Results({ params }: { params: ByUserParams }): ReactNode {
  const query = useJournalEntriesByUser(params);
  if (query.isLoading) return <ReportSkeleton />;
  if (query.isError) return <p role="alert" className="py-8 text-center text-destructive">The transactions could not be loaded.</p>;
  const rows = (query.data?.data ?? []).map((row, index) => ({
    ...row, sl: params.startingFrom + index, document: sourceLabel(row.source_type), status: statusLabel(row), amount: row.total_debit ?? '',
  }));
  if (rows.length === 0) return <p className="py-8 text-center text-muted-foreground">No transactions match.</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{`Showing ${params.startingFrom} to ${params.startingFrom + rows.length - 1} of ${query.data?.total ?? rows.length}`}</p>
        <ExportButton
          data={rows}
          filename="journal-by-user"
          columns={[
            { key: 'sl', label: 'S.No' }, { key: 'created_at', label: 'Entered On' }, { key: 'entry_date', label: 'Transaction Date' },
            { key: 'entry_number', label: 'Entry No.' }, { key: 'document', label: 'Document' }, { key: 'narration', label: 'Narration' },
            { key: 'amount', label: 'Amount' }, { key: 'posted_by_name', label: 'Posted By' }, { key: 'status', label: 'Status' },
          ]}
        />
      </div>
      <Table aria-label="Transactions">
        <TableHeader>
          <TableRow>
            {['S.No', 'Entered On', 'Transaction Date', 'Entry No.', 'Document', 'Narration', 'Amount', 'Posted By', 'Status'].map((head) => <TableHead key={head}>{head}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.sl}</TableCell>
              <TableCell>{formatDate(row.created_at)}</TableCell>
              <TableCell>{formatDate(row.entry_date)}</TableCell>
              <TableCell><Link href={`/general-ledger/journal-entries/${row.id}`} className="text-primary underline">#{row.entry_number}</Link></TableCell>
              <TableCell>{row.document}</TableCell>
              <TableCell className="max-w-xs truncate">{row.narration}</TableCell>
              <TableCell className="text-right">{row.amount ? formatCurrency(row.amount) : '-'}</TableCell>
              <TableCell>{row.posted_by_name ?? 'System'}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * General Ledger › Query › By User (GL-17, screen GL-S12): the entries one
 * person (or the system) posted, by kind of document, entered-on and
 * transaction dates; all, or only the voided ones (reversed entries and
 * their reversals).
 */
export function QueryByUserPage(): ReactNode {
  const postersQuery = useJournalPosters();
  const posters = postersQuery.data ?? [];
  // An API older than GL-17 has no posters route and would ignore every filter here.
  const unavailable = postersQuery.data === null;
  const [draft, setDraft] = useState<ByUserParams>({
    postedBy: '', documentType: 'all', createdFrom: '', createdTo: '', from: '', to: '', count: 100, startingFrom: 1, voidedOnly: false,
  });
  const [params, setParams] = useState<ByUserParams | null>(null);
  const issue = unavailable ? 'Query by user is not available yet on this server.' : problem(draft);
  const set = (patch: Partial<ByUserParams>): void => setDraft((current) => ({ ...current, ...patch }));
  const fetchWith = (voidedOnly: boolean): void => {
    if (!issue) setParams({ ...draft, voidedOnly });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="by-user-user">User</Label>
              <select id="by-user-user" className={SELECT_CLASS} value={draft.postedBy} onChange={(e) => set({ postedBy: e.target.value })}>
                <option value="">All</option>
                <option value="system">System</option>
                {posters.map((poster) => <option key={poster.user_id} value={poster.user_id}>{poster.name ?? 'Unnamed user'}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="by-user-count">No. of transactions</Label>
              <Input id="by-user-count" type="number" min={1} max={500} className="w-28" value={draft.count} onChange={(e) => set({ count: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="by-user-start">Starting from</Label>
              <Input id="by-user-start" type="number" min={1} className="w-28" value={draft.startingFrom} onChange={(e) => set({ startingFrom: Number(e.target.value) })} />
            </div>
          </div>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-1 text-sm font-medium">Document type</legend>
            {DOCUMENT_TYPES.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="by-user-doc" checked={draft.documentType === value} onChange={() => set({ documentType: value })} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-6">
            <DateRange label="Entered on" from={draft.createdFrom} to={draft.createdTo} onChange={(createdFrom, createdTo) => set({ createdFrom, createdTo })} />
            <DateRange label="Transaction date" from={draft.from} to={draft.to} onChange={(from, to) => set({ from, to })} />
          </div>
          {issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
          <div className="flex gap-2">
            <Button type="button" disabled={issue !== null} onClick={() => fetchWith(false)}>Fetch All Transactions</Button>
            <Button type="button" variant="outline" disabled={issue !== null} onClick={() => fetchWith(true)}>Fetch Only Voided Transactions</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {params ? <Results params={params} /> : <p className="py-8 text-center text-muted-foreground">Choose who and when, then Fetch.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
