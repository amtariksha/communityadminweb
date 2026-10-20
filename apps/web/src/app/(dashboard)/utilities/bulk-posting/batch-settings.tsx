'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useUtilitySettings } from '@/hooks/use-utility-settings';
import type { BatchMeterType } from '@/hooks/use-utility-batch-post';
import { METER_TYPES, meterTypeLabel, today } from '../utility-ui';
import { todayIST, utcDay } from '@/lib/date';

/** What a readings batch posts with (UTIL-15 grid, UTIL-16 upload). */
export interface BatchSettings {
  meter_type: BatchMeterType;
  period_from: string;
  period_to: string;
  invoice_date: string;
  post_now: boolean;
  ledger_account_id: string;
}

/** Last month, the usual billing period. */
function lastMonth(now = new Date()): { from: string; to: string } {
  const [year, month] = todayIST(now).split('-').map(Number);
  return { from: utcDay(new Date(Date.UTC(year, month - 2, 1))), to: utcDay(new Date(Date.UTC(year, month - 1, 0))) };
}

export function useBatchSettings(initialType: string | null): [BatchSettings, (patch: Partial<BatchSettings>) => void] {
  const autoPost = useUtilitySettings().data?.utility_billing?.auto_post ?? false;
  const period = lastMonth();
  const type = (METER_TYPES as readonly string[]).includes(initialType ?? '') ? (initialType as BatchMeterType) : 'water';
  const [settings, setSettings] = useState<BatchSettings>({ meter_type: type, period_from: period.from, period_to: period.to, invoice_date: today(), post_now: autoPost, ledger_account_id: '' });
  useEffect(() => setSettings((current) => ({ ...current, post_now: autoPost })), [autoPost]);
  return [settings, (patch) => setSettings((current) => ({ ...current, ...patch }))];
}

export type BatchRequestSettings = Omit<BatchSettings, 'ledger_account_id'> & { ledger_account_id?: string };

/** The settings sent to the API: the account only when one is chosen. */
export function batchRequest(settings: BatchSettings): BatchRequestSettings {
  const { ledger_account_id: account, ...rest } = settings;
  return account ? { ...rest, ledger_account_id: account } : rest;
}

/** The same, as the upload's options. */
export function batchOptions(settings: BatchSettings): Record<string, unknown> {
  return { ...batchRequest(settings) };
}

export function periodProblem(settings: BatchSettings): string | null {
  if (!settings.period_from || !settings.period_to || settings.period_from > settings.period_to) return 'Give the billing period (From on or before To).';
  if (!settings.invoice_date) return 'Give the invoice date.';
  return null;
}

export function BatchSettingsFields({ settings, onChange }: { settings: BatchSettings; onChange: (patch: Partial<BatchSettings>) => void }): ReactNode {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="ub-type">Meter type</Label>
          <Select id="ub-type" value={settings.meter_type} onChange={(e) => onChange({ meter_type: e.target.value as BatchMeterType })}>
            {METER_TYPES.map((type) => (
              <option key={type} value={type}>
                {meterTypeLabel(type)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ub-from">Period from</Label>
          <Input id="ub-from" type="date" value={settings.period_from} onChange={(e) => onChange({ period_from: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ub-to">Period to</Label>
          <Input id="ub-to" type="date" value={settings.period_to} onChange={(e) => onChange({ period_to: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ub-date">Invoice date</Label>
          <Input id="ub-date" type="date" value={settings.invoice_date} onChange={(e) => onChange({ invoice_date: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Income account (optional)</Label>
          <AccountSearchSelect value={settings.ledger_account_id} onChange={(value) => onChange({ ledger_account_id: value })} accountType={['income']} placeholder="The meter rule's account" />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={settings.post_now} onChange={(e) => onChange({ post_now: e.target.checked })} />
          Post now (otherwise the invoices are saved as drafts)
        </label>
      </div>
    </div>
  );
}
