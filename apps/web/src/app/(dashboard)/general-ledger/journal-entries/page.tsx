import { redirect } from 'next/navigation';

// General Ledger › Journal Entries opens on its list of posted entries.
export default function Page(): never {
  redirect('/general-ledger/journal-entries/old');
}
