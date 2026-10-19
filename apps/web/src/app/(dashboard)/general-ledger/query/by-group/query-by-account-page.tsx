'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { GeneralLedgerView } from '@/components/ledger-reports/general-ledger-view';
import { currentFinancialYear } from '@/lib/date';

interface Query {
  accountId: string;
  from: string;
  to: string;
}

/**
 * General Ledger › Query (GL-09): today's general ledger of one account for
 * a period. Picking a whole group, and the query by user, arrive with GL-17.
 */
export function QueryByAccountPage(): ReactNode {
  const year = currentFinancialYear();
  const [draft, setDraft] = useState<Query>({ accountId: '', from: year.start_date, to: year.end_date });
  const [query, setQuery] = useState<Query | null>(null);
  const invalid = draft.from > draft.to;

  function fetchDocuments(event: FormEvent): void {
    event.preventDefault();
    if (draft.accountId && draft.from && draft.to && !invalid) setQuery(draft);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form aria-label="Query an account" className="flex flex-wrap items-end gap-3" onSubmit={fetchDocuments}>
            <div className="w-72 space-y-1">
              <Label>Account</Label>
              <AccountSearchSelect value={draft.accountId} onChange={(accountId) => setDraft({ ...draft, accountId })} />
            </div>
            {(['from', 'to'] as const).map((end) => (
              <div key={end} className="space-y-1">
                <Label htmlFor={`query-${end}`}>{end === 'from' ? 'From' : 'To'}</Label>
                <Input
                  id={`query-${end}`}
                  type="date"
                  className="w-44"
                  required
                  value={draft[end]}
                  onChange={(e) => setDraft({ ...draft, [end]: e.target.value })}
                />
              </div>
            ))}
            <Button type="submit" disabled={!draft.accountId || invalid}>
              Fetch Documents
            </Button>
          </form>
          {invalid && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              The from date is after the to date.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {query ? (
            <GeneralLedgerView accountId={query.accountId} startDate={query.from} endDate={query.to} />
          ) : (
            <p className="py-8 text-center text-muted-foreground">Choose an account and a period, then Fetch Documents.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
