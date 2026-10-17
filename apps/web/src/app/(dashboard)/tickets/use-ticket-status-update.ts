'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { useUpdateTicket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { ticketStatusLabel } from '@/lib/ticket-status';
import { useWord } from '@/lib/vocabulary';

/** Moves a request to a status, with the toasts every request screen shows. */
export function useTicketStatusUpdate(): { update: (id: string, status: string) => void; isPending: boolean } {
  const { addToast } = useToast();
  const layout = useAdminLayout();
  const word = useWord();
  const mutation = useUpdateTicket();
  const { mutate } = mutation;

  const update = useCallback(
    (id: string, status: string) => {
      mutate(
        { id, status },
        {
          onSuccess() {
            addToast({ title: `${word('Ticket')} updated to ${ticketStatusLabel(status, layout)}`, variant: 'success' });
          },
          onError(error) {
            addToast({
              title: `Failed to update ${word('Ticket').toLowerCase()}`,
              description: friendlyError(error),
              variant: 'destructive',
            });
          },
        },
      );
    },
    [mutate, addToast, layout, word],
  );
  return { update, isPending: mutation.isPending };
}
