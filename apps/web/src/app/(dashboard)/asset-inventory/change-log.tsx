'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { DataTablePager } from '@/components/data-table/data-table-pager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import { useAuditLog, type AuditEntry } from '@/hooks/use-audit';
import type { UserSearchHit } from '@/hooks/use-user-search';
import { formatDate } from '@/lib/utils';
import { DiffTable } from '../audit/diff-table';

const PAGE_SIZE = 25;

/** The record's name as it was after the change (or before, for a delete). */
export function recordName(entry: AuditEntry): string {
  const rows = [entry.new_data, entry.old_data] as Array<Record<string, unknown> | null>;
  for (const key of ['name', 'contract_number', 'vendor_name', 'material_name']) {
    const found = rows.map((row) => row?.[key]).find((value) => typeof value === 'string' && value !== '');
    if (typeof found === 'string') return found;
  }
  return '—';
}

interface ChangeLogProps {
  /** Audit record types, e.g. asset and amc_contract. */
  recordTypes: readonly string[];
  /** Column heading of the record, e.g. "Asset". */
  recordLabel: string;
  /** Link to the record's page, when it has one. */
  recordHref?: (entry: AuditEntry) => string | undefined;
}

function LogRow({ entry, recordHref }: { entry: AuditEntry; recordHref?: ChangeLogProps['recordHref'] }): ReactNode {
  const href = recordHref?.(entry);
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{formatDate(entry.created_at)}</TableCell>
      <TableCell>{entry.user_name}</TableCell>
      <TableCell>{href ? <Link href={href} className="text-primary hover:underline">{recordName(entry)}</Link> : recordName(entry)}</TableCell>
      <TableCell className="capitalize">{entry.action}</TableCell>
      <TableCell>
        <DiffTable
          entityType={entry.entity_type}
          oldData={(entry.old_data as Record<string, unknown> | null) ?? null}
          newData={(entry.new_data as Record<string, unknown> | null) ?? null}
          changedOnly
        />
      </TableCell>
    </TableRow>
  );
}

/**
 * Change Logs as a page (ASSET-S8, SB-06): who changed which record, when,
 * and each field's old → new value, filtered by From · To · User.
 */
export function ChangeLog({ recordTypes, recordLabel, recordHref }: ChangeLogProps): ReactNode {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [user, setUser] = useState<UserSearchHit | null>(null);
  const [page, setPage] = useState(1);
  const query = useAuditLog({
    entity_type: recordTypes.join(','),
    from_date: from || undefined,
    to_date: to || undefined,
    user_id: user?.id,
    page,
    limit: PAGE_SIZE,
  });
  const entries = query.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="log-from">From</Label>
          <Input id="log-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-to">To</Label>
          <Input id="log-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <div className="w-64 space-y-1">
          <Label>User</Label>
          <UserSearchSelect scope="tenant" value={user} onChange={(next) => { setUser(next); setPage(1); }} placeholder="Everyone" />
        </div>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : query.error ? (
        <p className="text-sm text-destructive">The change log could not be loaded. Only roles that read the audit trail see it.</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">There are no records.</p>
      ) : (
        <>
          <Table aria-label="Change Logs">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>{recordLabel}</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Field · Old value → New value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => <LogRow key={entry.id} entry={entry} recordHref={recordHref} />)}
            </TableBody>
          </Table>
          <DataTablePager page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} pageSizeOptions={[PAGE_SIZE]} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
