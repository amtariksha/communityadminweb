'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShowLogsButton } from '@/components/show-logs';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import { useJournalEntry, type JournalEntryView as Entry } from '@/hooks/use-journal-entries';
import { ApiError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isReversible, mayReverse, sourceLabel, statusLabel } from '../journal-labels';
import { ReverseEntryDialog } from '../reverse-entry-dialog';

const SOURCE_DOCUMENTS: Readonly<Record<string, string>> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  credit_note: 'Credit Note',
  vendor_bill: 'Vendor Bill',
  vendor_payment: 'Vendor Payment',
  cheque: 'Cheque',
  bank_transfer: 'Transfer',
};

function sourceText(entry: Entry): string {
  const ref = entry.source_ref;
  if (!ref) return sourceLabel(entry.source_type);
  return `${SOURCE_DOCUMENTS[ref.type] ?? ref.type}${ref.number ? ` ${ref.number}` : ''}`;
}

function Header({ entry }: { entry: Entry }): ReactNode {
  const facts: Array<[string, string]> = [
    ['Entry No.', `#${entry.entry_number}`],
    ['Date', formatDate(entry.entry_date)],
    ['Source', sourceText(entry)],
    ['Status', statusLabel(entry)],
    ['Posted By', entry.posted_by_name ?? (entry.posted_by ? '—' : 'System')],
    ['Posted On', formatDate(entry.created_at)],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        {facts.map(([term, value]) => (
          <div key={term}>
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">{entry.narration}</p>
      {entry.attachment_key && <AttachmentLink fileKey={entry.attachment_key} />}
    </div>
  );
}

/** GL-20: the entry's supporting file, signed when opened (finance readers and the poster). */
function AttachmentLink({ fileKey }: { fileKey: string }): ReactNode {
  const open = useOpenStoredFile();
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">Attachment: </span>
      <button type="button" className="text-primary underline" onClick={() => void open({ key: fileKey })}>
        {fileKey.split('/').pop()}
      </button>
    </p>
  );
}

function Lines({ entry }: { entry: Entry }): ReactNode {
  const total = (side: 'debit' | 'credit') => entry.lines.reduce((sum, line) => sum + Number(line[side]), 0);
  return (
    <Table aria-label="Lines">
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Debit</TableHead>
          <TableHead className="text-right">Credit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entry.lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell>{[line.account_code, line.account_name].filter(Boolean).join(' — ')}</TableCell>
            <TableCell className="text-right">{Number(line.debit) > 0 ? formatCurrency(line.debit) : ''}</TableCell>
            <TableCell className="text-right">{Number(line.credit) > 0 ? formatCurrency(line.credit) : ''}</TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-semibold">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{formatCurrency(total('debit'))}</TableCell>
          <TableCell className="text-right">{formatCurrency(total('credit'))}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

/** One posted entry (GL-S7 entry view): header, lines with totals, Reverse for a manual entry. */
export function JournalEntryViewPage({ id }: { id: string }): ReactNode {
  const query = useJournalEntry(id);
  const [reversing, setReversing] = useState(false);
  const role = useMemo(() => currentRole(), []);
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading the entry…</p>;
  if (query.isError || !query.data) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <p role="alert" className="text-sm text-destructive">
        {missing ? 'This journal entry was not found.' : 'The entry could not be loaded. Reload the page to try again.'}
      </p>
    );
  }
  const entry = query.data;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap justify-end gap-2">
          <ShowLogsButton recordTypes={['journal_entry']} recordId={entry.id} />
          {mayReverse(role) && isReversible(entry) && (
            <Button variant="outline" onClick={() => setReversing(true)}>
              Reverse
            </Button>
          )}
        </div>
        <Header entry={entry} />
        <Lines entry={entry} />
      </CardContent>
      <ReverseEntryDialog entry={reversing ? entry : null} onClose={() => setReversing(false)} />
    </Card>
  );
}
