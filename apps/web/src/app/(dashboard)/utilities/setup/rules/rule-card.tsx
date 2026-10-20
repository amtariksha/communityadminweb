'use client';

import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MeterRule, MeterRuleStatus } from '@/hooks/use-meter-rules';
import { formatCurrency } from '@/lib/utils';
import { meterTypeLabel } from '../../utility-ui';
import { slabRange } from './rule-form-state';

const STATUS: Record<MeterRuleStatus, { label: string; variant: 'success' | 'secondary' | 'warning' }> = {
  active: { label: 'In force', variant: 'success' },
  scheduled: { label: 'From a later date', variant: 'warning' },
  superseded: { label: 'Replaced', variant: 'secondary' },
  ended: { label: 'Ended', variant: 'secondary' },
};

const yesNo = (value: boolean): string => (value ? 'Yes' : 'No');

function accountTitle(rule: MeterRule): string {
  const account = rule.ledger_account_name
    ? `${rule.ledger_account_code ? `${rule.ledger_account_code} ` : ''}${rule.ledger_account_name}`
    : 'No income account';
  return `${account} — ${meterTypeLabel(rule.meter_type)}`;
}

/**
 * One meter rule read-only (UTIL-S1): its income account and meter type,
 * Memorize / Cumulative, the dates, the slabs (Range · ₹) and Edit for the
 * open version when the user may change it.
 */
export function MeterRuleCard({ rule, onEdit }: { rule: MeterRule; onEdit?: (rule: MeterRule) => void }): ReactNode {
  const status = STATUS[rule.status];
  const editable = onEdit && rule.effective_to === null;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{accountTitle(rule)}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Memorize Readings : {yesNo(rule.memorize_readings)} · Cumulative Slab : {yesNo(rule.cumulative_slab)}
            <span title="Cumulative is meant for piped gas"> ⓘ</span> · Minimum {formatCurrency(Number(rule.minimum_charge))}
          </p>
          <p className="text-xs text-muted-foreground">
            From {rule.effective_from}
            {rule.effective_to ? ` to ${rule.effective_to}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {editable && (
            <Button type="button" size="sm" variant="outline" onClick={() => onEdit(rule)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm" aria-label={`Slabs of ${accountTitle(rule)}`}>
          <thead>
            <tr className="text-left">
              <th className="py-1 font-semibold">Range</th>
              <th className="py-1 text-right font-semibold">₹</th>
            </tr>
          </thead>
          <tbody>
            {rule.slabs.map((slab) => (
              <tr key={slab.id}>
                <td className="py-1">{slabRange(slab)}</td>
                <td className="py-1 text-right tabular-nums">{formatCurrency(Number(slab.rate_per_unit))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
