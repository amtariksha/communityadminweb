'use client';

import { useState, type ReactNode } from 'react';
import { Download, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { useAuditLog } from '@/hooks/use-audit';
import type { AuditEntry, AuditFilters } from '@/hooks/use-audit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'unit', label: 'Unit' },
  { value: 'member', label: 'Member' },
  { value: 'ledger_account', label: 'Ledger Account' },
  { value: 'account_group', label: 'Account Group' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'document', label: 'Document' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'asset', label: 'Asset' },
  { value: 'staff', label: 'Staff' },
];

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

function getActionBadgeVariant(action: string): 'success' | 'default' | 'destructive' {
  switch (action.toLowerCase()) {
    case 'create':
      return 'success';
    case 'update':
      return 'default';
    case 'delete':
      return 'destructive';
    default:
      return 'default';
  }
}

// ---------------------------------------------------------------------------
// Expandable row for JSON diff
// ---------------------------------------------------------------------------

interface ExpandableRowProps {
  entry: AuditEntry;
}

function ExpandableRow({ entry }: ExpandableRowProps): ReactNode {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-8">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">
          {formatTimestamp(entry.created_at)}
        </TableCell>
        <TableCell className="text-sm">{entry.user_name}</TableCell>
        <TableCell>
          <Badge variant={getActionBadgeVariant(entry.action)}>
            {entry.action}
          </Badge>
        </TableCell>
        <TableCell className="text-sm capitalize">{entry.entity_type.replace(/_/g, ' ')}</TableCell>
        <TableCell className="text-sm font-mono text-xs">{entry.entity_id}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{entry.ip_address}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Old Data</p>
                <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs">
                  {entry.old_data ? JSON.stringify(entry.old_data, null, 2) : '(none)'}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">New Data</p>
                <pre className="max-h-64 overflow-auto rounded bg-background p-3 text-xs">
                  {entry.new_data ? JSON.stringify(entry.new_data, null, 2) : '(none)'}
                </pre>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AuditContent(): ReactNode {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const filters: AuditFilters = {
    ...(entityType ? { entity_type: entityType } : {}),
    ...(action ? { action } : {}),
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading } = useAuditLog(filters);
  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Client-side search filter on user_name and entity_id
  const filteredEntries = searchQuery
    ? entries.filter(
        (entry) =>
          entry.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.entity_id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : entries;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Audit Trail' }]}
        title="Audit Trail"
        description="View all changes made across the system"
        actions={
          <ExportButton
            data={entries as unknown as Record<string, unknown>[]}
            filename={`audit-log-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'created_at', label: 'Timestamp' },
              { key: 'user_name', label: 'User' },
              { key: 'action', label: 'Action' },
              { key: 'entity_type', label: 'Entity Type' },
              { key: 'entity_id', label: 'Entity ID' },
              { key: 'ip_address', label: 'IP Address' },
            ]}
          />
        }
      />

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="filter-entity">Entity Type</Label>
              <Select
                id="filter-entity"
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              >
                {ENTITY_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-action">Action</Label>
              <Select
                id="filter-action"
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
              >
                {ACTION_TYPES.map((at) => (
                  <option key={at.value} value={at.value}>{at.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-from">From Date</Label>
              <Input
                id="filter-from"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-to">To Date</Label>
              <Input
                id="filter-to"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor="filter-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filter-search"
                  placeholder="Search by user or entity ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No audit entries found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <ExpandableRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
