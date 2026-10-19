'use client';

import { type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';
import { JournalEntryForm } from './journal-entry-form/journal-entry-form';

export interface JournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * New Journal Entry on /accounts: the journal form as a dialog (SB-07).
 * The classic layout opens the same form as a page
 * (/general-ledger/journal-entries/create, GL-11).
 */
export function JournalEntryDialog({ open, onOpenChange }: JournalEntryDialogProps): ReactNode {
  const { addToast } = useToast();
  return (
    <JournalEntryForm
      mode="dialog"
      open={open}
      onClose={() => onOpenChange(false)}
      onSaved={(entry) => {
        addToast({ title: `Journal entry #${entry.entry_number} posted`, variant: 'success' });
        onOpenChange(false);
      }}
    />
  );
}
