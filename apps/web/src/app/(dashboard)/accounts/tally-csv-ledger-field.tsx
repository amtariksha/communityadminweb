'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The ledger a Tally CSV ledger report is for, sent as `ledger_name` (only
 * for that report, and only when typed: the API otherwise reads the file's
 * "Ledger: <name>" line).
 */
export function csvLedgerOption(importType: string, ledgerName: string): { ledger_name?: string } {
  const name = ledgerName.trim();
  return importType === 'ledger_report' && name ? { ledger_name: name } : {};
}

export function TallyCsvLedgerField(props: { value: string; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="tally-csv-ledger">Ledger this report is for</Label>
      <Input
        id="tally-csv-ledger"
        maxLength={255}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="e.g. Bank Account"
      />
      <p className="text-[11px] text-muted-foreground">
        Leave it empty to use the &quot;Ledger:&quot; line at the top of the Tally file.
      </p>
    </div>
  );
}
