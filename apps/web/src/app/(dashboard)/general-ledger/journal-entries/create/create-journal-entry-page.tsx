'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { JournalEntryForm, type PostedEntry } from '../../../accounts/journal-entry-form/journal-entry-form';

/**
 * General Ledger › Journal Entries › Create Journal Entry (GL-11, GL-S6):
 * the journal form as a page. After a post the page says which entry was
 * posted, with links to view it or post another; Close goes to the list.
 */
export function CreateJournalEntryPage(): ReactNode {
  const router = useRouter();
  const [posted, setPosted] = useState<PostedEntry | null>(null);

  return (
    <div className="space-y-4">
      {posted && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          <span className="font-medium">Entry #{posted.entry_number} posted.</span>
          <Link href={`/general-ledger/journal-entries/${posted.id}`} className="text-primary underline">
            View it
          </Link>
          <button type="button" className="text-primary underline" onClick={() => setPosted(null)}>
            Post another
          </button>
        </div>
      )}
      <JournalEntryForm
        mode="page"
        onClose={() => router.push('/general-ledger/journal-entries/old')}
        onSaved={setPosted}
      />
    </div>
  );
}
