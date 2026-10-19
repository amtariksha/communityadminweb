'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from '@/app/(dashboard)/settings/settings-access';

/** null = follow the GSTIN (claimed only when the society has one). */
export type InputCreditChoice = boolean | null;

export function readInputCredit(settings: Record<string, unknown> | null | undefined): InputCreditChoice {
  const value = settings?.gst_input_credit_claimable;
  return typeof value === 'boolean' ? value : null;
}

/** What the vendor invoice posting will do with input GST (EXP-11 reader). */
export function inputCreditClaimed(settings: Record<string, unknown> | null | undefined): boolean {
  const choice = readInputCredit(settings);
  if (choice !== null) return choice;
  const gstin = settings?.gstin;
  return typeof gstin === 'string' && gstin.trim().length > 0;
}

const CHOICES: ReadonlyArray<[InputCreditChoice, string]> = [
  [null, 'Follow the GSTIN — claim only while the society has one'],
  [true, 'Claim — debit CGST / SGST / IGST Input'],
  [false, 'Do not claim — add the GST to each expense head'],
];

/**
 * Purchase GST (EXP-11, SB-15): whether input GST on vendor invoices is
 * claimed on the input ledgers or is a cost of the expense head. Saved as
 * `gst_input_credit_claimable`; read when an invoice posts.
 */
export function InputCreditCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenant = useTenant(tenantId);
  const update = useTenantSettings();
  const settings = tenant.data?.settings_json as Record<string, unknown> | undefined;
  const saved = readInputCredit(settings);
  const [choice, setChoice] = useState<InputCreditChoice>(saved);

  useEffect(() => setChoice(saved), [saved]);

  if (!tenantId || !canChangeSettings()) return null;

  function save(): void {
    update.mutate(
      { tenant_id: tenantId, settings: { gst_input_credit_claimable: choice } },
      {
        onSuccess: (next) => {
          const kept = readInputCredit(next?.settings_json as Record<string, unknown> | undefined) === choice;
          addToast(kept ? { title: 'Purchase GST saved', variant: 'success' } : { title: 'Not saved', description: 'The server does not support this setting yet.', variant: 'destructive' });
        },
        onError: (error) => addToast({ title: 'Could not save', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h2 className="text-lg font-semibold">Purchase GST</h2>
        <p className="text-sm text-muted-foreground">
          New vendor invoices {inputCreditClaimed(settings) ? 'claim' : 'do not claim'} input GST today.
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Claim GST input credit</legend>
          {CHOICES.map(([value, label]) => (
            <label key={String(value)} className="flex items-center gap-2 text-sm">
              <input type="radio" name="gst-input-credit" checked={choice === value} onChange={() => setChoice(value)} />
              {label}
            </label>
          ))}
        </fieldset>
        <Button type="button" disabled={choice === saved || update.isPending} onClick={save}>Save</Button>
      </CardContent>
    </Card>
  );
}
