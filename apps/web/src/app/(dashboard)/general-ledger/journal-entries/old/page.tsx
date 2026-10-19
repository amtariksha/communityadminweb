import { type ReactNode } from 'react';
import { JournalEntriesList } from '../journal-entries-list';

// General Ledger › Journal Entries › Old Journal Entries (GL-10, screen GL-S7).
export default function Page(): ReactNode {
  return <JournalEntriesList mode="fetch" />;
}
