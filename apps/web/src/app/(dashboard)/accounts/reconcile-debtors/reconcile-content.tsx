'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useUnlinkedDebtors,
  useParseExistingDebtors,
  useLinkExistingDebtors,
  type TallyDebtorParseResult,
  type TallyDebtorLinkByIdInput,
} from '@/hooks/use-tally-import';
import { useUnits } from '@/hooks';
import {
  DebtorReviewTable,
  buildInitialDecisions,
  validateDecision,
  type DebtorDecisionMap,
} from '@/components/tally/debtor-review-table';

// FeatPlan P2 — backfill page for the Tally-imported sundry-debtor
// ledgers that landed without a unit / member / customer link.
// User flow:
//   1. Page loads → hits GET /tally-import/debtors/unlinked.
//   2. Admin clicks "Run AI parse" → fires
//      POST /tally-import/debtors/parse with the unlinked ledger ids
//      and seeds the review table with parsed decisions.
//   3. Admin reviews, edits, approves / skips per row.
//   4. Admin clicks "Link approved" → fires
//      POST /tally-import/debtors/link with the by-id payload.
//   5. Linked rows drop off the unlinked list (cache invalidated by
//      the hook's onSuccess); skipped rows stay until the admin
//      explicitly hides or deals with them.
//
// The review-table component is shared with the in-import flow on
// /accounts (apps/web/src/components/tally/debtor-review-table.tsx).

export default function ReconcileDebtorsContent(): ReactNode {
  const { addToast } = useToast();
  const unlinkedQuery = useUnlinkedDebtors(true);
  const parseExisting = useParseExistingDebtors();
  const linkExisting = useLinkExistingDebtors();
  const unitsQuery = useUnits({ limit: 2000 });

  // Parsed rows + decisions live entirely in component state. The
  // server caches nothing for the backfill path (unlike the
  // in-import preview's `_meta.debtorParsed` slot) — every Run AI
  // parse click hits Gemini fresh.
  const [parsedRows, setParsedRows] = useState<TallyDebtorParseResult[]>([]);
  const [decisions, setDecisions] = useState<DebtorDecisionMap>({});
  const hasParsed = parsedRows.length > 0;

  const unlinked = unlinkedQuery.data ?? [];

  // When the unlinked list refetches after a successful link, drop
  // any parsed rows that no longer match (i.e. their ledger_id is
  // gone from the unlinked list because they were linked).
  useEffect(() => {
    if (parsedRows.length === 0) return;
    const keep = new Set(unlinked.map((d) => d.id));
    const next = parsedRows.filter(
      (r) => r.ledger_id && keep.has(r.ledger_id),
    );
    if (next.length !== parsedRows.length) {
      setParsedRows(next);
      // Sync the decisions map shape too.
      setDecisions((prev) => {
        const cleaned: DebtorDecisionMap = {};
        for (const r of next) {
          const key = r.ledger_id!;
          if (prev[key]) cleaned[key] = prev[key];
        }
        return cleaned;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlinkedQuery.data]);

  function handleRunParse(): void {
    if (unlinked.length === 0) {
      addToast({
        title: 'No unlinked debtors to parse',
        variant: 'default',
      });
      return;
    }
    const ledgerIds = unlinked.map((d) => d.id);
    parseExisting.mutate(
      { ledger_ids: ledgerIds },
      {
        onSuccess(rows) {
          setParsedRows(rows);
          setDecisions(buildInitialDecisions(rows));
          addToast({
            title: `Parsed ${rows.length} debtor${rows.length === 1 ? '' : 's'}`,
            description:
              'Review each row and pick Approve or Skip before linking.',
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to parse debtor names',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleLink(): void {
    const links: TallyDebtorLinkByIdInput[] = [];
    const errs: string[] = [];
    for (const row of parsedRows) {
      if (!row.ledger_id) continue;
      const d = decisions[row.ledger_id];
      if (!d) continue;
      const err = d.action === 'approve' ? validateDecision(d) : null;
      if (d.action === 'approve' && err) {
        errs.push(`${row.name}: ${err}`);
        continue;
      }
      links.push({
        ledger_id: row.ledger_id,
        skip: d.action === 'skip',
        unit_id: d.unit_id ?? undefined,
        unit_number: d.unit_id ? undefined : d.unit_number || undefined,
        owners:
          d.action === 'approve'
            ? d.owners
                .map((n) => n.trim())
                .filter((n) => n.length > 0)
                .map((name) => ({ name }))
            : undefined,
      });
    }
    if (errs.length > 0) {
      addToast({
        title: 'Some rows need attention',
        description:
          errs.slice(0, 3).join(' · ') +
          (errs.length > 3 ? ` (+${errs.length - 3} more)` : ''),
        variant: 'destructive',
      });
      return;
    }
    if (links.length === 0) {
      addToast({
        title: 'Nothing to commit',
        description: 'Pick Approve or Skip on at least one row.',
        variant: 'default',
      });
      return;
    }
    linkExisting.mutate(
      { links },
      {
        onSuccess(results) {
          const linked = results.filter((r) => r.status === 'linked').length;
          const skipped = results.filter((r) => r.status === 'skipped').length;
          const failed = results.filter((r) => r.status === 'failed').length;
          addToast({
            title: `Reconciled ${linked} debtor${linked === 1 ? '' : 's'}`,
            description: `${skipped} skipped${
              failed > 0 ? `, ${failed} failed` : ''
            }.`,
            variant: failed > 0 ? 'default' : 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to link debtors',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  // Approval count drives the action button's enabled state.
  const approvedCount = useMemo(
    () =>
      Object.values(decisions).filter((d) => d.action === 'approve').length,
    [decisions],
  );
  const skipCount = useMemo(
    () => Object.values(decisions).filter((d) => d.action === 'skip').length,
    [decisions],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Accounts', href: '/accounts' },
          { label: 'Reconcile Debtors' },
        ]}
        title="Reconcile Sundry Debtors"
        description="Link existing Tally-imported debtor ledgers to society units, owner members, and customers."
      />

      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Accounts
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Unlinked sundry debtors
                {unlinked.length > 0 && (
                  <Badge variant="warning">{unlinked.length}</Badge>
                )}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Ledgers under <code className="font-mono text-xs">CA.SD</code>{' '}
                that have no customer record pointing at them. Run the AI
                parser to extract unit number + owners from each ledger
                name, review, and link in one go.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleRunParse}
                disabled={
                  unlinkedQuery.isLoading ||
                  parseExisting.isPending ||
                  unlinked.length === 0
                }
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {parseExisting.isPending
                  ? 'Parsing…'
                  : hasParsed
                    ? 'Re-run AI parse'
                    : 'Run AI parse'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unlinkedQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : unlinked.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
              All sundry-debtor ledgers are linked to customers. Nothing
              left to reconcile.
            </div>
          ) : !hasParsed ? (
            // Pre-parse state — show the raw list with a nudge to run
            // the parser.
            <div className="rounded-md border divide-y">
              {unlinked.slice(0, 50).map((d) => (
                <div key={d.id} className="px-4 py-2 text-sm">
                  {d.name}
                </div>
              ))}
              {unlinked.length > 50 && (
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  + {unlinked.length - 50} more — run the parser to review
                  all rows.
                </div>
              )}
            </div>
          ) : (
            <DebtorReviewTable
              rows={parsedRows}
              decisions={decisions}
              onChange={setDecisions}
              existingUnits={(unitsQuery.data?.data ?? []).map((u) => ({
                id: u.id,
                unit_number: u.unit_number,
              }))}
              disabled={linkExisting.isPending}
            />
          )}
        </CardContent>
        {hasParsed && (
          <div className="border-t bg-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {approvedCount} approve
              </span>
              {' · '}
              <span>{skipCount} skip</span>
              {' · '}
              <span>
                {parsedRows.length - approvedCount - skipCount} pending
              </span>
            </div>
            <Button
              onClick={handleLink}
              disabled={
                linkExisting.isPending ||
                approvedCount + skipCount === 0
              }
            >
              {linkExisting.isPending
                ? 'Linking…'
                : `Link ${approvedCount} approved · skip ${skipCount}`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
