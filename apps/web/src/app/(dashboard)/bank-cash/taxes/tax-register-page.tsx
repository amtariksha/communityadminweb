'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useTaxRegister, type TaxRegisterKind, type TaxRegisterParams, type TaxRegisterResult } from '@/hooks/use-tax-registers';
import { currentRole } from '@/lib/current-role';
import { lastMonthRanges } from '@/lib/date';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RemitDialog } from './remit-dialog';

const NAMES: Readonly<Record<TaxRegisterKind, string>> = { tds: 'TDS', sgst: 'State GST', cgst: 'Central GST', igst: 'Integrated GST' };
// POST /bank/tax-registers/remit.
const REMIT_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

/** A signed balance as "₹x Dr" / "₹x Cr". */
function drCr(value: string): string {
  const amount = Number(value);
  if (Math.round(amount * 100) === 0) return formatCurrency(0);
  return `${formatCurrency(Math.abs(amount))} ${amount > 0 ? 'Dr' : 'Cr'}`;
}

function RegisterTable({ result, tds }: { result: TaxRegisterResult; tds: boolean }): ReactNode {
  const headers = tds
    ? ['Sl.No', 'Date', 'Voucher No', 'Particulars', 'Party', 'Section', 'Deducted (Cr)', 'Remitted (Dr)', 'Balance', 'Challan No.']
    : ['Sl.No', 'Date', 'Voucher No', 'Particulars', 'Party', 'Ledger', 'Debit', 'Credit', 'Balance'];
  return (
    <Table aria-label="Tax register">
      <TableHeader>
        <TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="font-medium">
          <TableCell colSpan={headers.length - (tds ? 2 : 1)}>Opening balance</TableCell>
          <TableCell>{drCr(result.opening_balance)}</TableCell>
          {tds && <TableCell />}
        </TableRow>
        {result.rows.map((row, index) => (
          <TableRow key={row.journal_line_id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{formatDate(row.date)}</TableCell>
            <TableCell>{row.voucher_no}</TableCell>
            <TableCell className="max-w-xs truncate">{row.particulars}</TableCell>
            <TableCell>{row.party ?? ''}</TableCell>
            <TableCell>{tds ? row.section ?? '' : row.ledger === 'input' ? 'Input' : 'Output'}</TableCell>
            <TableCell className="text-right">{Number(tds ? row.credit : row.debit) ? formatCurrency(tds ? row.credit : row.debit) : ''}</TableCell>
            <TableCell className="text-right">{Number(tds ? row.debit : row.credit) ? formatCurrency(tds ? row.debit : row.credit) : ''}</TableCell>
            <TableCell>{drCr(row.balance)}</TableCell>
            {tds && <TableCell>{row.challan_no ?? ''}</TableCell>}
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-bold">
          <TableCell colSpan={headers.length - (tds ? 2 : 1)}>Closing balance</TableCell>
          <TableCell>{drCr(result.closing_balance)}</TableCell>
          {tds && <TableCell />}
        </TableRow>
      </TableBody>
    </Table>
  );
}

function Output({ params, tds }: { params: TaxRegisterParams; tds: boolean }): ReactNode {
  const query = useTaxRegister(params);
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (query.isError) return <p role="alert" className="text-sm text-destructive">The register could not be loaded.</p>;
  if (query.data === null) return <p role="note" className="text-sm text-muted-foreground">The tax registers are not available yet on this server.</p>;
  const result = query.data as TaxRegisterResult;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton
          data={result.rows.map((row, index) => ({ ...row, sl: index + 1 }))}
          filename={`${params.register}-register-${params.from}-to-${params.to}`}
          columns={[
            { key: 'sl', label: 'Sl.No' }, { key: 'date', label: 'Date' }, { key: 'voucher_no', label: 'Voucher No' },
            { key: 'particulars', label: 'Particulars' }, { key: 'party', label: 'Party' }, { key: tds ? 'section' : 'ledger', label: tds ? 'Section' : 'Ledger' },
            { key: 'debit', label: 'Debit' }, { key: 'credit', label: 'Credit' }, { key: 'balance', label: 'Balance' },
          ]}
        />
      </div>
      {result.rows.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{tds ? 'No TDS movements in this period.' : 'No movements in this period.'}</p>
      ) : (
        <RegisterTable result={result} tds={tds} />
      )}
      {!tds && <p className="text-xs text-muted-foreground">Earlier movements on the combined GST ledgers: see General Ledger.</p>}
    </div>
  );
}

/**
 * Bank & Cash › Taxes (BANK-15, screens BANK-S4 to BANK-S7): one tax
 * register — TDS, or a GST component with its Input / Output choice — that
 * opens empty until Fetch, with the opening balance, each movement and the
 * closing balance; Remit for finance writers (BANK-16).
 */
export function TaxRegisterPage({ register }: { register: TaxRegisterKind }): ReactNode {
  const tds = register === 'tds';
  const [month] = lastMonthRanges(1);
  const [draft, setDraft] = useState<TaxRegisterParams>({ register, ledger: 'all', from: month.start_date, to: month.end_date });
  const [params, setParams] = useState<TaxRegisterParams | null>(null);
  const [remitting, setRemitting] = useState(false);
  const mayRemit = useMemo(() => REMIT_ROLES.has(currentRole() ?? ''), []);
  const name = NAMES[register];
  const invalid = !draft.from || !draft.to || draft.from > draft.to;

  function fetchRegister(event: FormEvent): void {
    event.preventDefault();
    if (!invalid) setParams(draft);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-muted-foreground">
            GST returns, the TDS summary, challans and Form 16A: <Link href="/tax" className="text-primary underline">Taxes overview</Link>.
          </p>
          <form aria-label={`Fetch the ${name} register`} className="flex flex-wrap items-end gap-3" onSubmit={fetchRegister}>
            {!tds && (
              <fieldset className="flex flex-wrap gap-3 pb-2">
                <legend className="sr-only">Ledger</legend>
                {([['all', name], ['input', `Input ${name}`], ['output', `Output ${name}`]] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-1 text-sm">
                    <input type="radio" name="tax-ledger" checked={draft.ledger === value} onChange={() => setDraft({ ...draft, ledger: value })} />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}
            {(['from', 'to'] as const).map((end) => (
              <div key={end} className="space-y-1">
                <Label htmlFor={`tax-${end}`}>{end === 'from' ? 'From date' : 'To date'}</Label>
                <Input id={`tax-${end}`} type="date" className="w-44" value={draft[end]} onChange={(e) => setDraft({ ...draft, [end]: e.target.value })} />
              </div>
            ))}
            <Button type="submit" disabled={invalid}>Fetch</Button>
            {mayRemit && <Button type="button" variant="outline" onClick={() => setRemitting(true)}>Remit</Button>}
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {params ? <Output params={params} tds={tds} /> : <p className="py-8 text-center text-muted-foreground">Choose the period and press Fetch.</p>}
        </CardContent>
      </Card>
      <RemitDialog register={register} open={remitting} onClose={() => setRemitting(false)} />
    </div>
  );
}
