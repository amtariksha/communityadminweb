'use client';

import { type ReactNode } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { fetchPresignedDownloadUrl, useAddTicketComment, useHelpdeskTemplates, useTicket } from '@/hooks';
import type { Ticket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { ticketStatusLabel } from '@/lib/ticket-status';
import { formatDate } from '@/lib/utils';
import { priorityTone, statusTone } from './ticket-badges';
import { ConvertToCommunityButton } from './convert-to-community';
import { StatusPicker } from './status-picker';
import { TicketDetailThreads } from './ticket-detail-threads';
import { useTicketStatusUpdate } from './use-ticket-status-update';

interface TicketDetailDialogProps {
  /** The request to show; '' keeps the dialog closed. */
  ticketId: string;
  onClose: () => void;
}

interface Attachment {
  url: string;
  name: string;
}

function attachmentsOf(ticket: Ticket): Attachment[] {
  const urls = ticket.attachment_urls ?? [];
  if (urls.length > 0) {
    return urls.map((url, i) => ({ url, name: ticket.attachment_names?.[i] ?? `Attachment ${i + 1}` }));
  }
  return ticket.attachment_url ? [{ url: ticket.attachment_url, name: ticket.attachment_name ?? 'View attachment' }] : [];
}

// The next step offered for each status (the record page, HELP-19, adds the rest).
const NEXT_STEP: Readonly<Record<string, { status: string; label: string; icon: ReactNode }>> = {
  open: { status: 'in_progress', label: 'Mark In Progress', icon: <Clock className="mr-2 h-4 w-4" /> },
  in_progress: { status: 'resolved', label: 'Resolve', icon: <CheckCircle2 className="mr-2 h-4 w-4" /> },
  resolved: { status: 'closed', label: 'Close', icon: <XCircle className="mr-2 h-4 w-4" /> },
};

/** Personal, Personal (on behalf) or Community (HELP-15). */
function requestTypeLabel(ticket: Pick<Ticket, 'request_type' | 'raised_on_behalf'>): string {
  if (ticket.request_type === 'community') return 'Community';
  return ticket.raised_on_behalf ? 'Personal (on behalf)' : 'Personal';
}

function Facts({ detail }: { detail: Ticket }): ReactNode {
  const { addToast } = useToast();
  const layout = useAdminLayout();

  async function openAttachment(attachment: Attachment): Promise<void> {
    try {
      const url = await fetchPresignedDownloadUrl({ fileUrl: attachment.url, disposition: 'inline', fileName: attachment.name });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      addToast({ title: 'Could not open attachment', description: friendlyError(err), variant: 'destructive' });
    }
  }

  const attachments = attachmentsOf(detail);
  return (
    <div className="grid grid-cols-2 gap-y-3 text-sm">
      <span className="text-muted-foreground">Status</span>
      <span>
        <Badge variant={statusTone(detail.status)}>{ticketStatusLabel(detail.status, layout)}</Badge>
      </span>
      <span className="text-muted-foreground">Priority</span>
      <span>
        <Badge variant={priorityTone(detail.priority)}>{detail.priority}</Badge>
      </span>
      <span className="text-muted-foreground">Category</span>
      <span className="capitalize">{detail.category}</span>
      {detail.unit_number && (
        <>
          <span className="text-muted-foreground">Unit</span>
          <span>{detail.unit_number}</span>
        </>
      )}
      {detail.request_type && (
        <>
          <span className="text-muted-foreground">Type</span>
          <span>{requestTypeLabel(detail)}</span>
        </>
      )}
      {detail.description && (
        <>
          <span className="text-muted-foreground">Description</span>
          <span className="whitespace-pre-line">{detail.description}</span>
        </>
      )}
      <span className="text-muted-foreground">Created</span>
      <span>{formatDate(detail.created_at)}</span>
      {detail.resolved_at && (
        <>
          <span className="text-muted-foreground">Resolved</span>
          <span>{formatDate(detail.resolved_at)}</span>
        </>
      )}
      {detail.sla_due_at && (
        <>
          <span className="text-muted-foreground">SLA Due</span>
          <span>{formatDate(detail.sla_due_at)}</span>
        </>
      )}
      {attachments.length > 0 && (
        <>
          <span className="text-muted-foreground">{attachments.length > 1 ? 'Attachments' : 'Attachment'}</span>
          <span className="flex flex-col items-start gap-1">
            {attachments.map((attachment) => (
              <button
                key={attachment.url}
                type="button"
                className="text-primary hover:underline"
                onClick={() => void openAttachment(attachment)}
              >
                {attachment.name}
              </button>
            ))}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * A request's facts, its next status step and both conversation threads
 * (HELP-04), as a wide dialog. Used by /tickets and by the classic lists
 * until the record page (HELP-19).
 */
export function TicketDetailDialog({ ticketId, onClose }: TicketDetailDialogProps): ReactNode {
  const { addToast } = useToast();
  const detailQuery = useTicket(ticketId);
  const commentMutation = useAddTicketComment();
  const { data: templates = [] } = useHelpdeskTemplates();
  const statusUpdate = useTicketStatusUpdate();
  const detail = detailQuery.data;
  const next = detail ? NEXT_STEP[detail.status] : undefined;

  async function addComment(message: string, isInternal: boolean): Promise<void> {
    try {
      await commentMutation.mutateAsync({ ticket_id: ticketId, message, is_internal: isInternal });
      addToast({ title: isInternal ? 'Internal note added' : 'Reply sent to the resident', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Failed to add comment', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <Dialog open={ticketId !== ''} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.ticket_number ?? 'Loading...'}</DialogTitle>
          <DialogDescription>{detail?.subject ?? ''}</DialogDescription>
        </DialogHeader>
        {detailQuery.isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-4 py-4">
            <Facts detail={detail} />
            <div className="flex flex-wrap items-center gap-2">
              {next && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusUpdate.isPending}
                  onClick={() => statusUpdate.update(detail.id, next.status)}
                >
                  {next.icon} {next.label}
                </Button>
              )}
              <StatusPicker
                id="ticket-detail-status"
                current={detail.status}
                disabled={statusUpdate.isPending}
                onChange={(status) => statusUpdate.update(detail.id, status)}
              />
              <ConvertToCommunityButton ticket={detail} />
            </div>
            <Separator />
            <TicketDetailThreads
              comments={detail.comments ?? []}
              templates={templates}
              isPosting={commentMutation.isPending}
              onPost={addComment}
            />
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
