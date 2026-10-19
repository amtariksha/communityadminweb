'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useNumbering, useSetNumbering, type NumberingRow } from '@/hooks/use-vendor-ledger';
import { friendlyError } from '@/lib/api-error';

type Draft = Partial<Record<NumberingRow['key'], string>>;

/** The numbers that change: each typed value above the last issued; anything else is an error message. */
export function numberingChanges(rows: readonly NumberingRow[], draft: Draft): { body: Partial<Record<NumberingRow['key'], number>>; error: string | null } {
  const body: Partial<Record<NumberingRow['key'], number>> = {};
  for (const row of rows) {
    const typed = draft[row.key]?.trim();
    if (!typed || Number(typed) === row.next) continue;
    const next = Number(typed);
    if (!Number.isInteger(next) || next <= row.last_issued) return { body, error: `Next number must be greater than ${row.last_issued}` };
    body[row.key] = next;
  }
  return { body, error: null };
}

/**
 * Expense Tracker › Setup › Numbering (EXP-18, screen EXP-S3): where the
 * payment voucher, debit note, purchase request and bill numbers continue
 * from. Prefixes stay fixed; a number at or below the last one issued is
 * refused, so none repeats.
 */
export function NumberingForm(): ReactNode {
  const { addToast } = useToast();
  const numbering = useNumbering();
  const save = useSetNumbering();
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);
  const rows = numbering.data ?? [];

  useEffect(() => {
    if (numbering.data) setDraft(Object.fromEntries(numbering.data.map((row) => [row.key, String(row.next)])));
  }, [numbering.data]);

  if (numbering.data === null) return <p className="text-sm text-muted-foreground">Numbering setup is not available yet on this server.</p>;

  function submit(): void {
    const { body, error: problem } = numberingChanges(rows, draft);
    setError(problem);
    if (problem || Object.keys(body).length === 0) return;
    save.mutate(body, {
      onSuccess: () => addToast({ title: 'Numbering saved', variant: 'success' }),
      onError: (err) => setError(friendlyError(err)),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">Numbering</h2>
        <form aria-label="Numbering" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {rows.map((row) => (
            <div key={row.key} className="space-y-1">
              <Label htmlFor={`num-${row.key}`}>{`Next ${row.label} Number`}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{row.prefix}</span>
                <Input id={`num-${row.key}`} type="number" min={row.last_issued + 1} step={1} value={draft[row.key] ?? ''} onChange={(e) => setDraft({ ...draft, [row.key]: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">Last issued: {row.last_issued || 'none'}</p>
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>Save</Button>
          </div>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
