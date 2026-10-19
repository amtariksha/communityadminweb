'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useReverseJournalEntry, type JournalEntryRow } from '@/hooks/use-journal-entries';
import { friendlyError } from '@/lib/api-error';
import { reverseConfirmText } from './journal-labels';

interface ReverseEntryDialogProps {
  entry: JournalEntryRow | null;
  onClose: () => void;
}

/** Reverse confirm (GL-S7): posts the mirror entry; refusals show the API's message. */
export function ReverseEntryDialog({ entry, onClose }: ReverseEntryDialogProps): ReactNode {
  const { addToast } = useToast();
  const reverse = useReverseJournalEntry();

  function confirm(): void {
    if (!entry) return;
    reverse.mutate(entry.id, {
      onSuccess(response) {
        addToast({
          title: `Entry #${entry.entry_number} reversed`,
          description: `Reversal entry #${response.data.entry_number} posted.`,
          variant: 'success',
        });
        onClose();
      },
      onError(error: Error) {
        addToast({ title: 'Could not reverse the entry', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={entry !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse entry #{entry?.entry_number}?</DialogTitle>
          <DialogDescription>{entry ? reverseConfirmText(entry) : ''}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reverse.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={reverse.isPending}>
            {reverse.isPending ? 'Reversing…' : 'Reverse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
