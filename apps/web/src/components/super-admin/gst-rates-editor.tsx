'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Percent, Plus, RotateCcw, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  DEFAULT_GST_RATES,
  useTaxRates,
  useUpdateGstRates,
} from '@/hooks/use-tax-rates';
import { friendlyError } from '@/lib/api-error';
import { getUser } from '@/lib/auth';

// QA Round 12 #12-3c (carry-over) — super-admin GST rates editor.
//
// The canonical Indian GST slabs (or whatever the platform operator
// configures) live in `platform_config.tax_rates.gst` as a sorted
// number array. They drive the GST dropdown rendered by
// `<GstRateSelect>` across every invoice line, vendor bill, and
// billing-rule template — so this is THE single most fan-out config
// row in the platform.
//
// Backend exposes a typed PATCH endpoint at
// `/super-admin/platform-config/tax-rates` (super-admin.controller.ts:361)
// which Zod-validates the shape (each rate 0-100, 1-20 entries) and
// de-dupes + sorts ascending server-side. This editor mirrors that
// validation client-side so the admin gets an inline error before
// the round-trip.
//
// RBAC — backend Roles guard at the controller level enforces
// super_admin. The editor renders as read-only when the caller
// isn't super_admin (defense-in-depth: the /super-admin/* layout
// already redirects non-super-admin users away, so this branch is
// effectively unreachable in production).

// Each rate must parse as a non-negative number ≤ 100, integer or
// one decimal place. Mirrors `gst-rate-select.tsx` formatting (2
// dp on display when fractional). Empty string accepted only as a
// "clear the input" sentinel (caller bails before submit).
const RATE_RE = /^(\d{1,2}(\.\d)?|100(\.0)?)$/;

function parseRate(input: string): number | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'Enter a rate' };
  if (!RATE_RE.test(trimmed)) {
    return { error: 'Use a whole number or one decimal place, 0–100' };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return { error: 'Rate must be between 0 and 100' };
  }
  return num;
}

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
}

function dedupeSort(rates: readonly number[]): number[] {
  return Array.from(new Set(rates)).sort((a, b) => a - b);
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function GstRatesEditor(): ReactNode {
  const { addToast } = useToast();
  const ratesQuery = useTaxRates();
  const updateMutation = useUpdateGstRates();

  // Read role once on mount — the user shape doesn't change within a
  // session, and `getUser()` reads localStorage which we don't want
  // to thrash on every render.
  const isSuperAdmin = useMemo(() => getUser()?.isSuperAdmin === true, []);

  const [draft, setDraft] = useState<number[]>([]);
  const [newRate, setNewRate] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Hydrate the draft list from the server's canonical (sorted) list
  // whenever the query lands. Re-runs after a successful save because
  // the mutation invalidates the cache, but only refills `draft` when
  // the server's list actually differs from what the user is editing
  // — otherwise dirty edits would get clobbered mid-form.
  useEffect(() => {
    const serverGst = ratesQuery.data?.gst;
    if (!serverGst) return;
    const sorted = dedupeSort(serverGst);
    setDraft((prev) => (arraysEqual(prev, sorted) ? prev : sorted));
  }, [ratesQuery.data?.gst]);

  const sortedDraft = useMemo(() => dedupeSort(draft), [draft]);
  const sortedServer = useMemo(
    () => dedupeSort(ratesQuery.data?.gst ?? []),
    [ratesQuery.data?.gst],
  );
  const dirty = !arraysEqual(sortedDraft, sortedServer);
  const matchesDefaults = arraysEqual(sortedDraft, DEFAULT_GST_RATES);

  function handleAdd(e?: FormEvent): void {
    if (e) e.preventDefault();
    if (!isSuperAdmin) return;
    const parsed = parseRate(newRate);
    if (typeof parsed !== 'number') {
      setInputError(parsed.error);
      return;
    }
    if (draft.includes(parsed)) {
      setInputError(`${formatRate(parsed)}% is already in the list`);
      return;
    }
    if (draft.length >= 20) {
      setInputError('Maximum 20 rates');
      return;
    }
    setDraft((prev) => dedupeSort([...prev, parsed]));
    setNewRate('');
    setInputError(null);
  }

  function handleRemove(rate: number): void {
    if (!isSuperAdmin) return;
    setDraft((prev) => prev.filter((r) => r !== rate));
  }

  function handleResetDefaults(): void {
    if (!isSuperAdmin) return;
    setDraft([...DEFAULT_GST_RATES]);
    setNewRate('');
    setInputError(null);
  }

  function handleSave(): void {
    if (!isSuperAdmin) return;
    if (sortedDraft.length === 0) {
      addToast({
        title: 'At least one GST rate required',
        description:
          'Empty list would leave every invoice GST dropdown blank. Add a rate or click Reset to defaults.',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate(
      { gst: sortedDraft },
      {
        onSuccess(data) {
          addToast({
            title: 'GST rates saved',
            description: `${data.gst.length} rates active across the platform.`,
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to save GST rates',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-4 w-4" />
          GST Rates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These rates appear in every invoice, billing rule, and
          vendor GST dropdown across all tenants. Sorted ascending on
          save; duplicates removed automatically.
          {!isSuperAdmin && (
            <>
              {' '}
              <span className="font-medium">Read-only —</span> only
              super-admins can change the platform GST list.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {ratesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-48" />
          </div>
        ) : (
          <>
            {/* Chip rail — current rates as removable pills. Sorted
                view so the order matches what residents see in the
                dropdown after save. */}
            <div className="flex flex-wrap items-center gap-2">
              {sortedDraft.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  No rates configured. Add at least one before saving.
                </p>
              ) : (
                sortedDraft.map((rate) => (
                  <span
                    key={rate}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-sm font-medium"
                  >
                    {formatRate(rate)}%
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemove(rate)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        aria-label={`Remove ${formatRate(rate)}% rate`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>

            {/* Add-rate form — super_admin only. Submits on Enter so
                the admin can rapid-fire entries without taking their
                hands off the keyboard. */}
            {isSuperAdmin && (
              <form
                onSubmit={handleAdd}
                className="flex flex-wrap items-end gap-2"
              >
                <div className="flex-1 min-w-[10rem] space-y-1">
                  <Label htmlFor="gst-new-rate">Add a rate</Label>
                  <Input
                    id="gst-new-rate"
                    type="text"
                    inputMode="decimal"
                    value={newRate}
                    onChange={(e) => {
                      setNewRate(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    placeholder="e.g. 18 or 18.5"
                  />
                  {inputError && (
                    <p className="text-xs text-destructive">{inputError}</p>
                  )}
                </div>
                <Button type="submit" variant="outline">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              </form>
            )}

            {/* Save / Reset row — only super_admin sees these. Save
                disabled until the draft actually differs from the
                server's list (or the mutation is in flight). Reset
                disabled when already at defaults. */}
            {isSuperAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDefaults}
                  disabled={matchesDefaults || updateMutation.isPending}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Reset to defaults ({DEFAULT_GST_RATES.map(formatRate).join(', ')}%)
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!dirty || updateMutation.isPending}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {updateMutation.isPending ? 'Saving…' : 'Save GST Rates'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
