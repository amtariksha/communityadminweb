import { type ReactNode } from 'react';
import { JournalEntryViewPage } from './journal-entry-view';

// General Ledger › Journal Entries › one entry (GL-10, GL-S7 entry view).
export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  return <JournalEntryViewPage id={id} />;
}
