'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useBankAccounts } from '@/hooks/use-bank';
import { useSaveUtilityBilling, type UtilitySettingsView } from '@/hooks/use-utility-settings';
import { friendlyError } from '@/lib/api-error';

const BASIS: Record<string, string> = { due_date: 'Due Date', invoice_date: 'Invoice Date' };

/** Setup › Simple Interest, read-only with Edit (UTIL-S1 → UTIL-S3). */
export function SimpleInterestCard({ view }: { view: UtilitySettingsView }): ReactNode {
  const interest = view.utility_interest;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Simple Interest</CardTitle>
        <Link href="/utilities/setup/interest" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          Edit
        </Link>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Rate</dt>
          <dd>{interest.rate_pa}% pa</dd>
          <dt className="text-muted-foreground">Due period</dt>
          <dd>{interest.due_days} days</dd>
          <dt className="text-muted-foreground">Interest start date</dt>
          <dd>{interest.start_date ?? '—'}</dd>
          <dt className="text-muted-foreground">Counted from</dt>
          <dd>{BASIS[interest.basis] ?? interest.basis}</dd>
        </dl>
        {view.utility_interest_inherited && (
          <p className="mt-2 text-xs text-muted-foreground">Not set for utilities: these are the maintenance values.</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * "Do not show in utility payment instructions" (UTIL-S1, UTIL-14): the bank
 * accounts a utility invoice does not name, with its own Save.
 */
export function ExcludedBanksCard({ view, canWrite }: { view: UtilitySettingsView; canWrite: boolean }): ReactNode {
  const { addToast } = useToast();
  const accounts = (useBankAccounts().data ?? []).filter((account) => account.is_active);
  const save = useSaveUtilityBilling();
  const saved = view.utility_billing?.excluded_bank_account_ids ?? [];
  const savedKey = [...saved].sort().join(',');
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set(saved));
  useEffect(() => setTicked(new Set(saved)), [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const supported = view.utility_billing !== undefined && 'excluded_bank_account_ids' in view.utility_billing;

  function toggle(id: string): void {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(): void {
    save.mutate(
      { excluded_bank_account_ids: [...ticked] },
      {
        onSuccess: () => addToast({ title: 'Saved', description: 'Utility invoices name only the accounts left unticked.', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Do not show in utility payment instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported && <p className="text-sm text-muted-foreground">Not available yet on this server.</p>}
        {supported && accounts.length === 0 && <p className="text-sm text-muted-foreground">No bank accounts yet.</p>}
        {supported && (
          <fieldset disabled={!canWrite} className="space-y-1">
            {accounts.map((account) => (
              <label key={account.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ticked.has(account.id)} onChange={() => toggle(account.id)} />
                {account.bank_name} · {account.account_number}
                {account.is_primary ? ' (primary)' : ''}
              </label>
            ))}
          </fieldset>
        )}
        {supported && canWrite && accounts.length > 0 && (
          <Button type="button" size="sm" disabled={save.isPending || [...ticked].sort().join(',') === savedKey} onClick={submit}>
            Save
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** "Post utility invoices on creation" (ours, UTIL-07): the batch's Post now default. */
export function AutoPostCard({ view, canWrite }: { view: UtilitySettingsView; canWrite: boolean }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveUtilityBilling();
  if (!view.utility_billing) return null;
  const on = view.utility_billing.auto_post;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={on}
            disabled={!canWrite || save.isPending}
            onChange={(e) =>
              save.mutate(
                { auto_post: e.target.checked },
                { onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }) },
              )
            }
          />
          Post utility invoices on creation (the batch&apos;s &quot;Post now&quot; starts ticked)
        </label>
      </CardContent>
    </Card>
  );
}
