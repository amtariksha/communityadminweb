'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import type { BillPreview, TdsBasis } from '@/hooks/use-vendor-bills';
import type { InvoiceHeader } from './invoice-model';

interface TdsBlockProps {
  header: InvoiceHeader;
  sections: ReadonlyArray<{ code: string; label: string }>;
  onChange: (patch: Partial<InvoiceHeader>) => void;
}

/** Deduct TDS: value, basis (% without GST or an amount) and section (EXP-S8). */
export function InvoiceTdsBlock({ header, sections, onChange }: TdsBlockProps): ReactNode {
  const deducting = Number(header.tdsValue) > 0;
  return (
    <fieldset className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
      <legend className="px-1 text-sm font-medium">Deduct TDS</legend>
      <div className="space-y-1">
        <Label htmlFor="inv-tds-value">Value</Label>
        <Input id="inv-tds-value" type="number" min="0" step="0.01" value={header.tdsValue} onChange={(e) => onChange({ tdsValue: e.target.value })} />
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">Basis</span>
        <div className="flex gap-4 pt-2 text-sm">
          {([['percent_excl_gst', '% without GST'], ['amount', 'Amount']] as Array<[TdsBasis, string]>).map(([basis, text]) => (
            <label key={basis} className="flex items-center gap-1">
              <input type="radio" name="inv-tds-basis" checked={header.tdsBasis === basis} onChange={() => onChange({ tdsBasis: basis })} />
              {text}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="inv-tds-section">Section{deducting ? ' *' : ''}</Label>
        <Select id="inv-tds-section" value={header.tdsSection} onChange={(e) => onChange({ tdsSection: e.target.value })}>
          <option value="">—</option>
          {sections.map((s) => (
            <option key={s.code} value={s.code}>{s.code} — {s.label}</option>
          ))}
        </Select>
      </div>
    </fieldset>
  );
}

interface EntriesPanelProps {
  preview: BillPreview | undefined;
  loading: boolean;
  error: unknown;
}

/** "Entries that will be posted", as the server computes them for the form as it stands. */
export function InvoiceEntriesPanel({ preview, loading, error }: EntriesPanelProps): ReactNode {
  return (
    <section aria-label="Entries that will be posted" className="space-y-2 rounded-md border p-3">
      <h3 className="text-sm font-semibold">Entries that will be posted</h3>
      {error ? (
        <p role="alert" className="text-sm text-destructive">{friendlyError(error)}</p>
      ) : !preview ? (
        <p className="text-sm text-muted-foreground">{loading ? 'Working out the entries…' : 'Fill the invoice to see its entries.'}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {preview.entries.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell>{entry.account_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.debit ? formatCurrency(entry.debit) : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.credit ? formatCurrency(entry.credit) : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <dl className="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-4">
            <dt>Taxable</dt><dd data-testid="total-taxable">{formatCurrency(preview.totals.taxable)}</dd>
            <dt>GST</dt><dd data-testid="total-gst">{formatCurrency(preview.totals.gst)}</dd>
            <dt>TDS</dt><dd data-testid="total-tds">{formatCurrency(preview.totals.tds)}</dd>
            <dt>Payable to vendor</dt><dd data-testid="total-payable">{formatCurrency(preview.totals.payable)}</dd>
          </dl>
          {!preview.claimable && preview.totals.gst > 0 && (
            <p className="text-xs text-muted-foreground">The society does not claim GST input credit, so the GST is added to each expense head.</p>
          )}
          {preview.duplicate_invoice_number && <p role="alert" className="text-sm text-destructive">This vendor already has an invoice with this number.</p>}
        </>
      )}
    </section>
  );
}
