'use client';

import { useState, type ReactNode } from 'react';
import { Hash, Save } from 'lucide-react';
import type { BillingNumberSeries } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useNumbering, useSaveNumbering, type NumberingRow } from '@/hooks/use-billing-documents';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { draftError, draftOf, toNumberingPayload, type NumberingDraft, type NumberingDrafts } from './numbering';
import { NumberingRowView } from './numbering-row';

function NumberingTable({ rows, canWrite }: { rows: NumberingRow[]; canWrite: boolean }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveNumbering();
  const [drafts, setDrafts] = useState<NumberingDrafts>(() => Object.fromEntries(rows.map((row) => [row.series, draftOf(row)])));
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const labels = new Map(rows.map((row) => [row.series, row.label]));
  const errors = Object.fromEntries(rows.map((row) => [row.series, draftError(row, drafts[row.series] ?? draftOf(row))]));
  const payload = toNumberingPayload(rows, drafts);
  const canSave = Object.keys(payload).length > 0 && Object.values(errors).every((error) => error === null) && !save.isPending;

  function change(series: BillingNumberSeries, draft: NumberingDraft): void {
    setDrafts((prev) => ({ ...prev, [series]: draft }));
    setServerErrors({});
    setServerError(null);
  }

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync(payload);
      addToast({ title: 'Numbering saved', description: 'The next documents take these numbers.', variant: 'success' });
    } catch (error) {
      const byRow = error instanceof ApiError ? error.fieldErrors : {};
      setServerErrors(byRow);
      setServerError(Object.keys(byRow).length > 0 ? null : friendlyError(error));
      addToast({ title: 'Could not save numbering', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-3">
      <Table aria-label="Numbering">
        <TableHeader>
          <TableRow>
            <TableHead>Series</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Digits</TableHead>
            <TableHead className="text-right">Last issued</TableHead>
            <TableHead>Next number</TableHead>
            <TableHead className="sr-only">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <NumberingRowView
              key={row.series}
              row={row}
              draft={drafts[row.series] ?? draftOf(row)}
              sharesLabel={row.shares_with ? labels.get(row.shares_with) ?? null : null}
              canWrite={canWrite}
              error={errors[row.series] ?? serverErrors[row.series] ?? null}
              change={(draft) => change(row.series, draft)}
            />
          ))}
        </TableBody>
      </Table>
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      {canWrite && (
        <Button onClick={() => void submit()} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? 'Saving…' : 'Save numbering'}
        </Button>
      )}
    </div>
  );
}

/**
 * Setup › Other › Numbering (INC-41): prefix, digits and next number of
 * each invoice, receipt, credit-note and debit-note series. Numbers only
 * move forward; a non-member series shares its member series until it is
 * set up on its own. Changed by the community admin.
 */
export function NumberingCard({ canWrite }: { canWrite: boolean }): ReactNode {
  const query = useNumbering();
  let body: ReactNode;
  if (isNotDeployed(query.error)) body = <p className="text-sm text-muted-foreground">Numbering is not available yet on this server.</p>;
  else if (query.error) body = <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
  else if (!query.data) body = <p className="text-sm text-muted-foreground">Loading…</p>;
  else body = <NumberingTable key={query.dataUpdatedAt} rows={query.data} canWrite={canWrite} />;
  return (
    <Card id="numbering">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Numbering
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Continue the society&apos;s own numbering: the next number must be above the last one issued. Issued documents
          keep their numbers.
        </p>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
