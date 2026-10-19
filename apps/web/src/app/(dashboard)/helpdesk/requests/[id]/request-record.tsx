'use client';

import { useMemo, type ReactNode } from 'react';
import { Printer, X } from 'lucide-react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAddTicketComment, useHelpdeskTemplates, useTicket, useUpdateTicket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { useWord } from '@/lib/vocabulary';
import { ConvertToCommunityButton } from '../../../tickets/convert-to-community';
import { TicketDetailThreads } from '../../../tickets/ticket-detail-threads';
import type { UploadedFiles } from '../../new/use-request-files';
import { RecordEdit } from './record-edit';
import { RecordRating } from './record-rating';
import { RecordSummary } from './record-summary';
import type { RecordChanges } from './record-values';

// Roles PATCH /tickets/:id admits (supervisors within their team's categories).
const EDIT_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'community_admin',
  'accountant',
  'security_supervisor',
  'facility_supervisor',
]);

interface RequestRecordProps {
  ticketId: string;
  onClose: () => void;
}

function useRecordActions(ticketId: string) {
  const { addToast } = useToast();
  const update = useUpdateTicket();
  const comment = useAddTicketComment();

  async function save(changes: RecordChanges): Promise<void> {
    try {
      await update.mutateAsync({ id: ticketId, ...changes });
      addToast({ title: 'Changes saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the changes', description: friendlyError(error), variant: 'destructive' });
    }
  }

  async function post(message: string, isInternal: boolean, files?: UploadedFiles): Promise<void> {
    try {
      await comment.mutateAsync({
        ticket_id: ticketId,
        message,
        is_internal: isInternal,
        ...(files ? { attachment_urls: files.urls, attachment_names: files.names } : {}),
      });
      addToast({ title: isInternal ? 'Internal note added' : 'Reply sent to the resident', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Failed to add comment', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return { save, post, isSaving: update.isPending, isPosting: comment.isPending };
}

/**
 * The request record (HELP-19, screen HELP-S9): summary, one edit block
 * with Save Changes, both conversations with images, Logs, Print (summary
 * and Resident Communication only), Convert to Community Request, Close.
 * A page in classic and the wide dialog in standard (SB-07).
 */
export function RequestRecord({ ticketId, onClose }: RequestRecordProps): ReactNode {
  const word = useWord();
  const query = useTicket(ticketId);
  const { data: templates = [] } = useHelpdeskTemplates();
  const actions = useRecordActions(ticketId);
  const canEdit = useMemo(() => EDIT_ROLES.has(currentRole() ?? ''), []);
  const ticket = query.data;

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!ticket) {
    // An unknown id, or a request outside the caller's reach (the API answers 404 for both).
    return <p role="alert" className="text-sm text-muted-foreground">Request not found.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h2 className="text-lg font-semibold">{`${word('Ticket')} ${ticket.ticket_number}`}</h2>
        <div className="flex flex-wrap gap-2">
          <ShowLogsButton recordTypes={['ticket']} recordId={ticket.id} label="Logs" />
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          <ConvertToCommunityButton ticket={ticket} />
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="mr-1 h-4 w-4" /> Close
          </Button>
        </div>
      </div>
      <RecordSummary ticket={ticket} requestNoLabel={word('Ticket #')} />
      <RecordRating survey={ticket.survey} />
      <Separator className="print:hidden" />
      <RecordEdit key={ticket.updated_at} ticket={ticket} canEdit={canEdit} isSaving={actions.isSaving} onSave={actions.save} />
      <Separator className="print:hidden" />
      <TicketDetailThreads
        comments={ticket.comments ?? []}
        templates={templates}
        isPosting={actions.isPosting}
        onPost={actions.post}
        withFiles
        threadClassName={{ internal: 'print:hidden' }}
      />
    </div>
  );
}
