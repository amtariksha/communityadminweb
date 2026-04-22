'use client';

import { useState, type ReactNode } from 'react';
import { History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntityHistory } from '@/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
}

function actionVariant(
  action: string,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove') || a.includes('cancel'))
    return 'destructive';
  if (a.includes('create') || a.includes('add')) return 'success';
  if (a.includes('update') || a.includes('patch')) return 'warning';
  return 'secondary';
}

/**
 * Batch 12 — Audit entity-history drilldown.
 *
 * Opens from the audit log table (View history button). Shows the
 * chronological trail of every change to a single entity so admins
 * can answer "who edited this invoice before it went wrong?" without
 * scrolling the whole audit log.
 *
 * `useEntityHistory` was already exposed in hooks/use-audit.ts but had
 * no consumer until this modal.
 */
export function EntityHistoryModal({
  open,
  onClose,
  entityType,
  entityId,
}: Props): ReactNode {
  const { data, isLoading, isError, error } = useEntityHistory(
    entityType,
    entityId,
  );
  const rows = data ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Entity History — {entityType}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {entityId}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load history —{' '}
              {(error as Error)?.message ?? 'unknown error'}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No audit entries for this {entityType}. Either it&apos;s new
              and hasn&apos;t been modified yet, or it was created before
              the audit interceptor was wired globally (pre-
              commit 568e9e4).
            </p>
          ) : (
            <ol className="space-y-3">
              {rows.map((r, idx) => (
                <li
                  key={r.id}
                  className="relative rounded-md border bg-muted/20 p-3"
                >
                  {/* Timeline dot */}
                  <div
                    aria-hidden
                    className="absolute -left-1 top-4 h-2 w-2 rounded-full bg-primary"
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Badge variant={actionVariant(r.action)}>{r.action}</Badge>
                    <span className="text-sm font-medium">
                      {r.user_name ?? 'System'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('en-IN')}
                    </span>
                    {r.ip_address && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.ip_address}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      #{rows.length - idx}
                    </span>
                  </div>
                  <DataDiff old={r.old_data} next={r.new_data} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Minimal before/after diff renderer. Renders just the keys that
 * changed between old_data and new_data. Avoids a heavy deep-diff
 * library for this use case — we already have the two JSONB blobs,
 * a key-level shallow diff is plenty for "what did this PATCH do".
 */
function DataDiff({
  old: oldData,
  next: newData,
}: {
  old: unknown;
  next: unknown;
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const oldObj = (oldData && typeof oldData === 'object') ? (oldData as Record<string, unknown>) : {};
  const newObj = (newData && typeof newData === 'object') ? (newData as Record<string, unknown>) : {};

  const allKeys = Array.from(
    new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
  );
  const changedKeys = allKeys.filter(
    (k) => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]),
  );

  if (changedKeys.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No field-level changes captured.
      </p>
    );
  }

  const visible = expanded ? changedKeys : changedKeys.slice(0, 5);

  return (
    <div className="mt-2 space-y-1">
      {visible.map((key) => {
        const before = oldObj[key];
        const after = newObj[key];
        return (
          <div
            key={key}
            className="grid grid-cols-[120px_1fr] gap-2 rounded bg-background/70 p-2 text-xs"
          >
            <span className="font-mono text-muted-foreground">{key}</span>
            <div className="space-y-0.5">
              <div className="flex gap-1 text-destructive/80">
                <span className="w-3 text-muted-foreground">−</span>
                <span className="break-all font-mono">{formatValue(before)}</span>
              </div>
              <div className="flex gap-1 text-success">
                <span className="w-3 text-muted-foreground">+</span>
                <span className="break-all font-mono">{formatValue(after)}</span>
              </div>
            </div>
          </div>
        );
      })}
      {changedKeys.length > 5 && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? 'Show less'
            : `Show ${changedKeys.length - 5} more changed field${changedKeys.length - 5 === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  if (typeof v === 'string') return v || '""';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
