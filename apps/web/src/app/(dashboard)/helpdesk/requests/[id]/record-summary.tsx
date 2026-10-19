'use client';

import { type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';
import { fetchPresignedDownloadUrl, type Ticket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { requestAgeDays } from '../../../tickets/ticket-badges';

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

/** Personal, Personal (on behalf) or Community (HELP-15); blank for an older API. */
export function requestTypeLabel(ticket: Pick<Ticket, 'request_type' | 'raised_on_behalf'>): string {
  if (!ticket.request_type) return '—';
  if (ticket.request_type === 'community') return 'Community';
  return ticket.raised_on_behalf ? 'Personal (on behalf)' : 'Personal';
}

function Fact({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Request No., Opened On, By, Unit, Type, Days, the request text and its files. */
export function RecordSummary({ ticket, requestNoLabel }: { ticket: Ticket; requestNoLabel: string }): ReactNode {
  const { addToast } = useToast();
  const attachments = attachmentsOf(ticket);

  async function open(attachment: Attachment): Promise<void> {
    try {
      const url = await fetchPresignedDownloadUrl({ fileUrl: attachment.url, disposition: 'inline', fileName: attachment.name });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      addToast({ title: 'Could not open attachment', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <section aria-label="Request summary" className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Fact label={requestNoLabel}>{ticket.ticket_number}</Fact>
        <Fact label="Opened On">{formatDate(ticket.created_at)}</Fact>
        <Fact label="By">{ticket.created_by_name ?? '—'}</Fact>
        <Fact label="Unit">{ticket.unit_number ?? '—'}</Fact>
        <Fact label="Type">{requestTypeLabel(ticket)}</Fact>
        <Fact label="Days">{requestAgeDays(ticket)}</Fact>
      </dl>
      <div className="text-sm">
        <p className="font-medium">{ticket.subject}</p>
        {ticket.description && ticket.description !== ticket.subject && (
          <p className="mt-1 whitespace-pre-line text-muted-foreground">{ticket.description}</p>
        )}
      </div>
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {attachments.map((attachment) => (
            <li key={attachment.url}>
              <button type="button" className="text-primary hover:underline" onClick={() => void open(attachment)}>
                {attachment.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
