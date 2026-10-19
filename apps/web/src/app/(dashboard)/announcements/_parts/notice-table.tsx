'use client';

import type { ReactNode } from 'react';
import { MoreHorizontal, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { announcementState, type Announcement } from '@/hooks';
import { formatDate } from '@/lib/utils';
import { priorityVariant, recipientsLabel, STATE_LABELS, stateVariant, typeLabel } from './labels';
import type { NoticeActions } from './notice-actions';

interface NoticeTableProps {
  rows: readonly Announcement[];
  loading: boolean;
  actions: NoticeActions;
  onView: (row: Announcement) => void;
  onEdit: (row: Announcement) => void;
  emptyText: string;
}

function RowMenu({ row, actions, onView, onEdit }: { row: Announcement } & Omit<NoticeTableProps, 'rows' | 'loading' | 'emptyText'>): ReactNode {
  const state = announcementState(row);
  const item = (label: string, run: () => void, danger = false) => (
    <DropdownMenuItem className={danger ? 'text-destructive' : undefined} onClick={(e) => { e.stopPropagation(); run(); }}>
      {label}
    </DropdownMenuItem>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions for ${row.title}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item('View', () => onView(row))}
        {(state === 'draft' || state === 'active') && item('Edit', () => onEdit(row))}
        {state === 'draft' && item('Post', () => actions.post(row))}
        {state === 'awaiting_approval' && row.can_approve && item('Approve', () => actions.approve(row))}
        {state === 'awaiting_approval' && row.can_approve && item('Reject', () => actions.askReject(row))}
        {state === 'active' && item('Edit Expiry', () => actions.askExpiry(row))}
        {(state === 'draft' || state === 'active') && <DropdownMenuSeparator />}
        {state === 'draft' && item('Delete', () => actions.askDelete(row), true)}
        {state === 'active' && item('Retire', () => actions.askDelete(row), true)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Title({ row }: { row: Announcement }): ReactNode {
  return (
    <span className="flex items-center gap-2">
      {row.is_pinned && <Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
      {row.title}
      {row.source === 'member' && <Badge variant="secondary">Member</Badge>}
      {announcementState(row) === 'draft' && row.rejection_reason && <Badge variant="warning">Returned</Badge>}
    </span>
  );
}

/** The standard announcements table; every state's actions in the row menu. */
export function NoticeTable(props: NoticeTableProps): ReactNode {
  const headers = ['Title', 'Type', 'Priority', 'Recipients', 'Status', 'Created'];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
          <TableHead className="w-20">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {[...headers, 'a'].map((h) => <TableCell key={h}><Skeleton className="h-4 w-20" /></TableCell>)}
            </TableRow>
          ))}
        {!props.loading && props.rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{props.emptyText}</TableCell>
          </TableRow>
        )}
        {!props.loading &&
          props.rows.map((row) => {
            const state = announcementState(row);
            return (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => props.onView(row)}>
                <TableCell className="max-w-[280px] truncate font-medium"><Title row={row} /></TableCell>
                <TableCell>{typeLabel(row)}</TableCell>
                <TableCell><Badge variant={priorityVariant(row.priority)}>{row.priority}</Badge></TableCell>
                <TableCell>{recipientsLabel(row)}</TableCell>
                <TableCell><Badge variant={stateVariant(state)}>{STATE_LABELS[state]}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                <TableCell><RowMenu row={row} {...props} /></TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}
