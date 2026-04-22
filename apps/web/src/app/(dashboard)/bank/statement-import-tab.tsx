'use client';

import { useRef, useState, type ReactNode } from 'react';
import { FileUp, Download, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
  useBankAccounts,
  useStatementRows,
  useImportStatement,
  useExcludeRow,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

interface ParsedRow {
  transaction_date: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
}

/**
 * Parses a bank-statement CSV into the shape `useImportStatement()`
 * expects. Header is required. Accepts column names
 * case-insensitively; common variants are listed below.
 *
 * Expected headers (any of the variants in each group):
 *   - Date / Transaction Date / txn_date / Txn Date
 *   - Description / Narration / Particulars / Details
 *   - Debit / Withdrawal / DR
 *   - Credit / Deposit / CR
 *   - Balance (optional)
 *
 * Errors surface per-row so the UI can show partial failures without
 * rejecting the whole import.
 */
function parseCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have a header and at least one row'] };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const indexOf = (...names: string[]): number => {
    for (const name of names) {
      const idx = headers.indexOf(name.toLowerCase());
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const dateIdx = indexOf('date', 'transaction date', 'txn_date', 'txn date');
  const descIdx = indexOf('description', 'narration', 'particulars', 'details');
  const debitIdx = indexOf('debit', 'withdrawal', 'dr');
  const creditIdx = indexOf('credit', 'deposit', 'cr');
  const balanceIdx = indexOf('balance', 'running balance');

  if (dateIdx < 0 || descIdx < 0 || debitIdx < 0 || creditIdx < 0) {
    return {
      rows: [],
      errors: [
        'Missing required columns. Need Date, Description, Debit, Credit (Balance optional).',
      ],
    };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const dateStr = cells[dateIdx]?.trim() ?? '';
    const iso = toIsoDate(dateStr);
    if (!iso) {
      errors.push(`Row ${i + 1}: invalid date "${dateStr}"`);
      continue;
    }
    const debit = parseAmount(cells[debitIdx]);
    const credit = parseAmount(cells[creditIdx]);
    const balance = balanceIdx >= 0 ? parseAmount(cells[balanceIdx]) : undefined;
    rows.push({
      transaction_date: iso,
      description: (cells[descIdx] ?? '').trim(),
      debit,
      credit,
      balance,
    });
  }

  return { rows, errors };
}

/** Split a CSV line honoring double-quoted fields with commas in them. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function toIsoDate(s: string): string | null {
  if (!s) return null;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD-MM-YYYY or DD/MM/YYYY (Indian banks)
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) {
      const n = parseInt(yyyy, 10);
      yyyy = String(n < 50 ? 2000 + n : 1900 + n);
    }
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function parseAmount(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[,₹\s]/g, '').trim();
  if (!cleaned || cleaned === '-') return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Batch 11 — Bank Statement Import tab.
 *
 * Lets the community admin upload a bank CSV, preview the parsed
 * rows, trigger the auto-match on import, and then review the
 * resulting match status per row with an explicit "Exclude" escape
 * hatch for bank fees / interest / anything that intentionally
 * shouldn't tie to a journal entry.
 */
export function StatementImportTab(): ReactNode {
  const { addToast } = useToast();
  const { data: accounts = [] } = useBankAccounts();

  const [accountId, setAccountId] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const importMutation = useImportStatement();
  const excludeMutation = useExcludeRow();
  const statementRows = useStatementRows(accountId, statusFilter || undefined);
  const rows = statementRows.data?.data ?? [];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseCsv(text);
    setParsed(result.rows);
    setParseErrors(result.errors);
    setFileName(file.name);
  }

  function handleImport(): void {
    if (!accountId) {
      addToast({ title: 'Pick a bank account first', variant: 'destructive' });
      return;
    }
    if (parsed.length === 0) {
      addToast({ title: 'No rows to import', variant: 'destructive' });
      return;
    }
    importMutation.mutate(
      { bank_account_id: accountId, rows: parsed },
      {
        onSuccess(res) {
          const d = res.data;
          addToast({
            title: `Imported ${d.total_rows} rows — ${d.auto_matched} auto-matched, ${d.unmatched} unmatched`,
            variant: 'success',
          });
          setParsed([]);
          setParseErrors([]);
          setFileName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError(err) {
          addToast({
            title: 'Import failed',
            description: (err as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleExclude(rowId: string): void {
    if (!window.confirm('Exclude this row from reconciliation?')) return;
    excludeMutation.mutate(rowId, {
      onSuccess() {
        addToast({ title: 'Row excluded', variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Exclude failed',
          description: (err as Error).message,
          variant: 'destructive',
        });
      },
    });
  }

  function downloadTemplate(): void {
    const csv =
      'Date,Description,Debit,Credit,Balance\n' +
      '2026-04-01,UPI-PAYMENT ABC123,0,5000,105000\n' +
      '2026-04-02,BANK CHARGES,200,0,104800\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank-statement-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Import Bank Statement</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template CSV
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload the statement CSV downloaded from your bank&apos;s net
            banking portal. Required columns: Date, Description, Debit,
            Credit. Optional: Balance. Indian DD-MM-YYYY or ISO YYYY-MM-DD
            date formats both accepted. Auto-match runs on import.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="import-account">Bank account</Label>
              <Select
                id="import-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Select bank account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} — {a.account_number}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-file">Statement CSV</Label>
              <Input
                id="import-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
              />
            </div>
          </div>

          {fileName && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-medium">{fileName}</p>
              <p className="text-muted-foreground">
                {parsed.length} rows parsed
                {parseErrors.length > 0 && (
                  <span className="text-destructive"> · {parseErrors.length} errors</span>
                )}
              </p>
              {parseErrors.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-destructive">
                  {parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {parseErrors.length > 5 && <li>…and {parseErrors.length - 5} more</li>}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={
                importMutation.isPending ||
                !accountId ||
                parsed.length === 0
              }
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importMutation.isPending
                ? 'Importing…'
                : `Import ${parsed.length} rows`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {accountId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Statement Rows</CardTitle>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-48"
              >
                <option value="">All statuses</option>
                <option value="auto_matched">Auto-matched</option>
                <option value="manual_matched">Manually matched</option>
                <option value="unmatched">Unmatched</option>
                <option value="excluded">Excluded</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Matched JE</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementRows.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length > 0 ? (
                  rows.map((r) => {
                    const status = r.match_status;
                    const variant: 'success' | 'warning' | 'destructive' | 'secondary' =
                      status === 'auto_matched' || status === 'manual_matched'
                        ? 'success'
                        : status === 'excluded'
                          ? 'secondary'
                          : 'warning';
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(r.transaction_date)}
                        </TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell className="text-right">
                          {r.debit > 0 ? formatCurrency(r.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.credit > 0 ? formatCurrency(r.credit) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.balance != null ? formatCurrency(r.balance) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant}>
                            {status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.je_entry_number ?? '—'}
                        </TableCell>
                        <TableCell>
                          {status === 'unmatched' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              title="Exclude from reconciliation"
                              onClick={() => handleExclude(r.id)}
                              disabled={excludeMutation.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(status === 'auto_matched' || status === 'manual_matched') && (
                            <Check className="h-3.5 w-3.5 text-success" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No statement rows imported yet. Upload a CSV above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
