'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DiffTable } from '@/app/(dashboard)/audit/diff-table';
import { useAuditLog, type AuditEntry } from '@/hooks/use-audit';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

// The roles GET /audit allows (audit.controller.ts).
const AUDIT_READERS = new Set(['super_admin', 'community_admin', 'accountant']);
const MAX_ENTRIES = 50;

function canReadLogs(): boolean {
  const user = getUser();
  if (user?.isSuperAdmin) return true;
  const tenantId = getCurrentTenant();
  const role = user?.societies.find((s) => s.id === tenantId)?.role;
  return role !== undefined && AUDIT_READERS.has(role);
}

interface ShowLogsButtonProps {
  // Audit record types the page shows, e.g. ['unit', 'member'].
  recordTypes: readonly string[];
  // On a record page, the record; otherwise every record of those types.
  recordId?: string;
  // Only changes of this kind, e.g. 'reject' for "Declined Records".
  action?: string;
  // The button's and the panel's name, when not "Show Logs".
  label?: string;
}

function auditTrailHref(recordTypes: readonly string[], recordId?: string, action?: string): string {
  const params = new URLSearchParams({ entity_type: recordTypes.join(',') });
  if (recordId) params.set('entity_id', recordId);
  if (action) params.set('action', action);
  return `/audit?${params.toString()}`;
}

function LogEntry({ entry }: { entry: AuditEntry }): ReactNode {
  return (
    <li className="space-y-1 border-b pb-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium">{entry.user_name}</span>
        <span className="text-muted-foreground">
          {entry.action} · {entry.entity_type.replace(/_/g, ' ')} · {formatDate(entry.created_at)}
        </span>
      </div>
      <DiffTable
        entityType={entry.entity_type}
        oldData={(entry.old_data as Record<string, unknown> | null) ?? null}
        newData={(entry.new_data as Record<string, unknown> | null) ?? null}
        changedOnly
      />
    </li>
  );
}

/**
 * Show Logs (requirements SB-06): the change history of the records a
 * page shows — who, when, and each changed field as old → new. Only for
 * roles that may read the audit trail.
 */
export function ShowLogsButton({ recordTypes, recordId, action, label = 'Show Logs' }: ShowLogsButtonProps): ReactNode {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAuditLog(
    {
      entity_type: recordTypes.join(','),
      ...(recordId ? { entity_id: recordId } : {}),
      ...(action ? { action } : {}),
      limit: MAX_ENTRIES,
    },
    { enabled: open },
  );

  if (!canReadLogs()) return null;
  const entries = data?.data ?? [];

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <History className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{label === 'Show Logs' ? 'Logs' : label}</DialogTitle>
            <DialogDescription>
              Latest {MAX_ENTRIES} changes, newest first.{' '}
              <Link href={auditTrailHref(recordTypes, recordId, action)} className="text-primary underline">
                Open in Audit Trail
              </Link>
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
              {entries.map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
