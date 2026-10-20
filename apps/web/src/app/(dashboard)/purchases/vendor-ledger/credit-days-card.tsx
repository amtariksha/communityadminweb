'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from '@/app/(dashboard)/settings/settings-access';
import { readCreditDays } from '../vendor-invoice/invoice-model';

/** The message for typed credit days the server would refuse, else null. */
export function creditDaysIssue(text: string): string | null {
  return /^\d{1,3}$/.test(text.trim()) && Number(text) <= 365 ? null : 'Enter whole days from 0 to 365';
}

/**
 * Vendor credit days (EXP-S8, SB-15): a vendor invoice falls due this many
 * days after its date unless it says otherwise. Saved as
 * `vendor_credit_days`; read by the invoice posting and the invoice form.
 */
export function CreditDaysCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenant = useTenant(tenantId);
  const update = useTenantSettings();
  const saved = readCreditDays(tenant.data?.settings_json as Record<string, unknown> | undefined);
  const [draft, setDraft] = useState(String(saved));

  useEffect(() => setDraft(String(saved)), [saved]);

  if (!tenantId || !canChangeSettings()) return null;
  const issue = creditDaysIssue(draft);

  function save(): void {
    const days = Number(draft);
    update.mutate(
      { tenant_id: tenantId, settings: { vendor_credit_days: days } },
      {
        onSuccess: (next) => {
          const kept = readCreditDays(next?.settings_json as Record<string, unknown> | undefined) === days;
          addToast(kept ? { title: 'Credit days saved', variant: 'success' } : { title: 'Not saved', description: 'The server does not support this setting yet.', variant: 'destructive' });
        },
        onError: (error) => addToast({ title: 'Could not save', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h2 className="text-lg font-semibold">Vendor credit days</h2>
        <p className="text-sm text-muted-foreground">A vendor invoice falls due this many days after its date, unless its due date is changed.</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="vendor-credit-days">Default vendor credit days</Label>
            <Input id="vendor-credit-days" inputMode="numeric" className="w-28" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>
          <Button type="button" disabled={issue !== null || Number(draft) === saved || update.isPending} onClick={save}>Save</Button>
        </div>
        {issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
      </CardContent>
    </Card>
  );
}
