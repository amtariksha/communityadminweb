'use client';

import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useEntryReasons, useSaveEntryReasons, type EntryReasonGridRow } from '@/hooks/use-gate-lists';
import { EntryReasonsGrid } from './entry-reasons-grid';
import { NotAvailableYet, SetupBlock } from './setup-block';

/** Block 4 — Visitor Entry Reasons (GATE-41). */
export function EntryReasonsBlock({ editable }: { editable: boolean }): ReactNode {
  const { addToast } = useToast();
  const reasonsQuery = useEntryReasons(true);
  const saveMutation = useSaveEntryReasons();

  async function save(rows: EntryReasonGridRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Entry reasons saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the entry reasons', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  return (
    <SetupBlock
      title="Visitor Entry Reasons"
      description="The guard picks one for every visitor. A visitor still inside after the expected stay raises an overstay alert and shows in red; with no stay set, the society default applies."
    >
      {reasonsQuery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : reasonsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">The entry reasons could not be loaded. Reload the page to try again.</p>
      ) : reasonsQuery.data === null || reasonsQuery.data === undefined ? (
        <NotAvailableYet what="Entry reasons" />
      ) : (
        <EntryReasonsGrid
          key={reasonsQuery.dataUpdatedAt}
          reasons={reasonsQuery.data}
          readOnly={!editable}
          isSaving={saveMutation.isPending}
          save={save}
        />
      )}
    </SetupBlock>
  );
}
