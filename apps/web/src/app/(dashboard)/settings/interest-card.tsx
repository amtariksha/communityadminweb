'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Percent, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from './settings-access';
import {
  interestErrors,
  readInterestSettings,
  sameInterest,
  toInterestPayload,
  type InterestForm,
} from './interest-settings';

/**
 * Settings › Late payment interest (INC-07). The rate, the days an invoice
 * stays unpaid before it falls due and the day interest is counted from are
 * read by invoice generation, the interest run and the invoice PDF.
 */
export function InterestCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const updateSettings = useTenantSettings();
  const savedRaw = tenantQuery.data?.settings_json?.billing_interest;
  const saved = readInterestSettings(savedRaw);
  const savedKey = JSON.stringify(saved);

  const [form, setForm] = useState<InterestForm>(saved);

  useEffect(() => {
    setForm(saved);
    // savedKey captures every field of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (!tenantId || !canChangeSettings()) return null;

  const errors = interestErrors(form);
  const hasErrors = Object.keys(errors).length > 0;
  const canSave = !sameInterest(form, saved) && !hasErrors && !updateSettings.isPending;

  function change<K extends keyof InterestForm>(key: K, value: InterestForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save(): void {
    const payload = toInterestPayload(form, savedRaw);
    updateSettings.mutate(
      { tenant_id: tenantId, settings: { billing_interest: payload } },
      {
        onSuccess: (tenant) => {
          // A server without this setting drops the key and still answers 200.
          const stored = readInterestSettings(tenant?.settings_json?.billing_interest);
          if (!tenant?.settings_json?.billing_interest || !sameInterest(stored, form)) {
            addToast({
              title: 'Interest settings not saved',
              description: 'The server does not support this setting yet.',
              variant: 'destructive',
            });
            return;
          }
          addToast({
            title: 'Interest settings saved',
            description: `${stored.rate_pa}% a year; invoices fall due ${stored.due_days} days after the invoice date.`,
            variant: 'success',
          });
        },
        onError: (error) => {
          addToast({
            title: 'Could not save interest settings',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card id="late-payment-interest">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Late payment interest
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Simple interest on the unpaid balance of an overdue invoice. The due days also set the
          due date of every new invoice. Applies to invoices and interest runs from now on.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interest-rate">Simple interest (% a year)</Label>
            <Input
              id="interest-rate"
              type="number"
              inputMode="decimal"
              min={0}
              max={36}
              step="0.01"
              value={form.rate_pa}
              onChange={(e) => change('rate_pa', e.target.value)}
            />
            {errors.rate_pa && <p className="text-xs text-destructive">{errors.rate_pa}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="interest-due-days">Due date (in days)</Label>
            <Input
              id="interest-due-days"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              step="1"
              value={form.due_days}
              onChange={(e) => change('due_days', e.target.value)}
            />
            {errors.due_days && <p className="text-xs text-destructive">{errors.due_days}</p>}
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Interest counted from</legend>
          <div className="flex flex-wrap gap-6">
            {(
              [
                ['due_date', 'Due date'],
                ['invoice_date', 'Invoice date'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="interest-basis"
                  checked={form.basis === value}
                  onChange={() => change('basis', value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="interest-start-date">Interest start date (optional)</Label>
          <Input
            id="interest-start-date"
            type="date"
            value={form.start_date}
            onChange={(e) => change('start_date', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Interest is never charged for days before this date.
          </p>
        </div>

        <Button onClick={save} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : 'Save interest settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
