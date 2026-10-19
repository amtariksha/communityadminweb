'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react';
import type { LedgerAccount } from '@communityos/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { useBulkImportBalances } from '@/hooks';
import {
  TEMPLATE_CSV,
  hasUnreadableSide,
  importPayload,
  importSummary,
  parseOpeningBalanceCsv,
  rowErrorText,
  type OpeningBalanceRow,
} from './opening-balance-import';

function downloadTemplate(): void {
  const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'opening_balances_template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function RowStatus({ row, error }: { row: OpeningBalanceRow; error?: string }): ReactNode {
  if (error) return <span className="text-sm text-destructive">{error}</span>;
  if (row.account_name) return <span className="text-sm">{row.account_name}</span>;
  return <span className="text-sm text-destructive">Not found</span>;
}

function PreviewTable({ rows, errors }: { rows: OpeningBalanceRow[]; errors: Map<number, string> }): ReactNode {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Code</TableHead>
            <TableHead>Matched Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const error = errors.get(index + 1);
            const ok = !error && row.account_id && row.balance_type;
            return (
              <TableRow key={index}>
                <TableCell className="font-mono text-sm">{row.account_code}</TableCell>
                <TableCell><RowStatus row={row} error={error} /></TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                <TableCell>
                  {row.balance_type ? (
                    <Badge variant="outline">{row.balance_type === 'debit' ? 'Dr' : 'Cr'}</Badge>
                  ) : (
                    <span className="text-sm text-destructive">?</span>
                  )}
                </TableCell>
                <TableCell>
                  {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PreviewNote({ rows }: { rows: OpeningBalanceRow[] }): ReactNode {
  const unmatched = rows.filter((row) => !row.account_id).length;
  return (
    <p className="text-sm text-muted-foreground">
      {rows.length - unmatched} of {rows.length} rows matched.
      {unmatched > 0 && ' Unmatched rows are checked again on import; if any is still unknown, nothing is imported.'}
      {hasUnreadableSide(rows) && ' Type must be debit or credit (Dr / Cr) on every row.'}
    </p>
  );
}

/** GL-05: all or nothing; every changed balance posts an opening-balance entry. */
export function ImportBalancesDialog({ accounts }: { accounts: LedgerAccount[] }): ReactNode {
  const { addToast } = useToast();
  const bulkImport = useBulkImportBalances();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<OpeningBalanceRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset(): void {
    setRows([]);
    setRowErrors(new Map());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function onLoad(loaded) {
      const parsed = parseOpeningBalanceCsv(String(loaded.target?.result ?? ''), accounts);
      if ('error' in parsed) {
        addToast({ title: parsed.error, variant: 'destructive' });
        return;
      }
      setRowErrors(new Map());
      setRows(parsed.rows);
    };
    reader.readAsText(file);
  }

  function handleSubmit(): void {
    bulkImport.mutate(importPayload(rows), {
      onSuccess(response) {
        const errors = response.data.errors ?? [];
        if (errors.length > 0) {
          setRowErrors(new Map(errors.map((error) => [error.row, rowErrorText(error.code)])));
          addToast({ title: 'Nothing imported', description: `${errors.length} row(s) need fixing`, variant: 'destructive' });
          return;
        }
        addToast({ title: importSummary(response.data), variant: 'success' });
        setOpen(false);
        reset();
      },
      onError(error: Error) {
        addToast({ title: 'Import failed', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Balances
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Opening Balances</DialogTitle>
          <DialogDescription>
            Upload a CSV of account codes and opening balances. Each changed balance posts an opening-balance entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Input ref={fileInputRef} type="file" accept=".csv" aria-label="CSV file" onChange={handleFile} className="flex-1" />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>
          {rows.length > 0 && <PreviewTable rows={rows} errors={rowErrors} />}
          {rows.length > 0 && <PreviewNote rows={rows} />}
        </div>
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={bulkImport.isPending || rows.length === 0 || hasUnreadableSide(rows)}>
            {bulkImport.isPending ? 'Importing...' : `Import ${rows.length} Balances`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
