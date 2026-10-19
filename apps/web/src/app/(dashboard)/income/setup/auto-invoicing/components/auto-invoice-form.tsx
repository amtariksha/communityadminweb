'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import {
  useAutoInvoiceSettings,
  useSaveAutoInvoiceSettings,
  type AutoInvoiceSettings,
} from '@/hooks/use-billing-rules';
import { ApiError, friendlyError } from '@/lib/api-error';

const FREQUENCIES: Array<[AutoInvoiceSettings['frequency'], string]> = [
  ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'],
  ['half_yearly', 'Half Yearly'],
  ['yearly', 'Yearly'],
];

/** "2026-11-01" ⇄ the month box's "2026-11". */
export const monthOf = (startDate: string | null): string => (startDate ? startDate.slice(0, 7) : '');
export const startOf = (month: string): string | null => (/^\d{4}-\d{2}$/.test(month) ? `${month}-01` : null);

function Fields({ form, change, disabled }: {
  form: AutoInvoiceSettings;
  change: <K extends keyof AutoInvoiceSettings>(key: K, value: AutoInvoiceSettings[K]) => void;
  disabled: boolean;
}): ReactNode {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={form.enabled} onChange={(e) => change('enabled', e.target.checked)} />
        Auto-invoicing from rule lines is on
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="auto-frequency">Invoicing Frequency</Label>
          <Select id="auto-frequency" value={form.frequency} onChange={(e) => change('frequency', e.target.value as AutoInvoiceSettings['frequency'])}>
            {FREQUENCIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="auto-start">AutoInvoice From</Label>
          <Input id="auto-start" type="month" value={monthOf(form.start_date)} onChange={(e) => change('start_date', startOf(e.target.value))} />
        </div>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Amount rounding</legend>
        <div className="flex flex-wrap gap-6">
          {([['two_decimals', '2 Decimal places'], ['whole_rupee', 'Whole Number']] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="auto-rounding" checked={form.rounding === value} onChange={() => change('rounding', value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.auto_post} onChange={(e) => change('auto_post', e.target.checked)} />
        Post generated invoices automatically
      </label>
    </fieldset>
  );
}

/** Setup › Auto Invoicing's form (INC-S1): when, how often and how the billing run bills from rule lines. */
export function AutoInvoiceForm({ canWrite }: { canWrite: boolean }): ReactNode {
  const { addToast } = useToast();
  const query = useAutoInvoiceSettings();
  const save = useSaveAutoInvoiceSettings();
  const saved = query.data?.billing_auto_invoice;
  const [form, setForm] = useState<AutoInvoiceSettings | null>(null);
  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return <p className="text-sm text-muted-foreground">{missing ? 'Auto invoicing from rule lines is not available yet on this server.' : friendlyError(query.error)}</p>;
  }
  if (!form || !query.data) return null;

  function change<K extends keyof AutoInvoiceSettings>(key: K, value: AutoInvoiceSettings[K]): void {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function submit(): Promise<void> {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      addToast({ title: 'Auto invoicing saved', description: 'Applies to the next billing run.', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save auto invoicing', description: friendlyError(error), variant: 'destructive' });
    }
  }

  const { interest, next_run_date: nextRun } = query.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto invoicing</CardTitle>
        <p className="text-xs text-muted-foreground">
          {nextRun ? `Next billing run: ${nextRun}. ` : ''}Changes apply to future runs only. Unit types are kept under Unit types; each unit&apos;s type and Sq.ft 2 are set from Edit Unit.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Fields form={form} change={change} disabled={!canWrite} />
        {canWrite && (
          <Button type="button" onClick={() => void submit()} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
        <p className="border-t pt-3 text-sm">
          <span className="font-medium">Late Payment Interest:</span> {interest.rate_pa}% p.a. · Due period: {interest.due_days} days · Counted from:{' '}
          {interest.basis === 'due_date' ? 'Due Date' : 'Invoice Date'}
        </p>
      </CardContent>
    </Card>
  );
}
