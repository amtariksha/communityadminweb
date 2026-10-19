'use client';

import { type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWord } from '@/lib/vocabulary';
import { RequestRecord } from '../helpdesk/requests/[id]/request-record';

interface TicketDetailDialogProps {
  /** The request to show; '' keeps the dialog closed. */
  ticketId: string;
  onClose: () => void;
}

/**
 * The request record (HELP-19) as a wide dialog, for the standard layout
 * (SB-07); classic opens the same record as its own page.
 */
export function TicketDetailDialog({ ticketId, onClose }: TicketDetailDialogProps): ReactNode {
  const word = useWord();
  return (
    <Dialog open={ticketId !== ''} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{word('Ticket')}</DialogTitle>
        </DialogHeader>
        {ticketId !== '' && <RequestRecord ticketId={ticketId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
