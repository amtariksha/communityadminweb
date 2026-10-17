'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { friendlyError } from '@/lib/api-error';
import { useBillingRuns, type BillingRun, type BillingRunStatus } from '@/hooks';

type BadgeVariant = 'secondary' | 'success' | 'warning' | 'destructive';

const STATUS_BADGES: Record<BillingRunStatus, { label: string; variant: BadgeVariant }> = {
  running: { label: 'Running', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'success' },
  completed_with_errors: { label: 'Completed with errors', variant: 'warning' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const COLUMN_COUNT = 6;

function StatusBadge({ status }: { status: BillingRunStatus }): ReactNode {
  const badge = STATUS_BADGES[status] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

interface RunRowProps {
  run: BillingRun;
  expanded: boolean;
  onToggle: () => void;
}

function RunRow({ run, expanded, onToggle }: RunRowProps): ReactNode {
  const errors = run.errors ?? [];
  const errorListId = `billing-run-errors-${run.id}`;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <TableRow>
        <TableCell>{formatDate(run.run_date)}</TableCell>
        <TableCell>{run.period_label ?? '—'}</TableCell>
        <TableCell>
          <StatusBadge status={run.status} />
        </TableCell>
        <TableCell className="text-right">{run.invoices_created}</TableCell>
        <TableCell className="text-right">{run.units_skipped}</TableCell>
        <TableCell>
          {errors.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={errorListId}
              className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline"
            >
              <Chevron className="h-4 w-4" />
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </button>
          )}
        </TableCell>
      </TableRow>
      {expanded && errors.length > 0 && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={COLUMN_COUNT}>
            <ul id={errorListId} className="space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={`${error.rule_id ?? 'run'}-${index}`}>
                  <span className="font-medium">{error.rule_name ?? 'Billing run'}:</span>{' '}
                  <span className="text-muted-foreground">{error.message}</span>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Invoices › Billing runs (INC-01): the monthly auto-invoice job's history,
 * so a failed run is visible here and not only in the server log. Admins and
 * accountants are also notified when a run has errors.
 */
export function BillingRunsPanel(): ReactNode {
  const runsQuery = useBillingRuns();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const runs = runsQuery.data ?? [];

  function toggle(runId: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }

  function renderBody(): ReactNode {
    if (runsQuery.isLoading) {
      return (
        <div className="space-y-2 p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      );
    }
    if (runsQuery.isError) {
      return (
        <p className="p-6 text-sm text-destructive">
          Could not load billing runs: {friendlyError(runsQuery.error)}
        </p>
      );
    }
    if (runs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <History className="mb-2 h-10 w-10 opacity-50" />
          <p className="text-lg font-medium">No billing runs yet</p>
          <p className="text-sm">The first run appears here after the 1st of the month.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Invoices created</TableHead>
            <TableHead className="text-right">Skipped</TableHead>
            <TableHead>Errors</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              expanded={expandedIds.has(run.id)}
              onToggle={() => toggle(run.id)}
            />
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing runs</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          The monthly auto-invoice job runs at 00:01 IST on the 1st and raises draft invoices from
          your active rules. Units already billed for the period are skipped. Invoices generated by
          hand are not listed here.
        </p>
      </CardHeader>
      <CardContent className="p-0">{renderBody()}</CardContent>
    </Card>
  );
}
