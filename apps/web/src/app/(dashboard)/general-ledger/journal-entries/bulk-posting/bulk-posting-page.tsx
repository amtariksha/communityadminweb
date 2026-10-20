'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function Tile({ title, text, children }: { title: string; text: string; children: ReactNode }): ReactNode {
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
        {children}
      </CardContent>
    </Card>
  );
}

const linkButton = buttonVariants({ variant: 'outline' });

/**
 * General Ledger › Journal Entries › Bulk Posting (GL-S8, GL-09, GL-24):
 * opening balances and journal entries from Excel (SB-13, posting as
 * manual entries do), Pass Retained Earnings and our Tally import.
 */
export function BulkPostingPage(): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Tile title="Batch Upload Opening Balance From Excel" text="Account codes with their opening balances; each change posts an opening-balance entry.">
        <Link href="/general-ledger/journal-entries/bulk-posting/opening-balances" className={linkButton} data-slot="button" data-size="default">
          Upload Opening Balances
        </Link>
      </Tile>
      <Tile title="Batch Upload Journal Entries From Excel" text="Lines grouped by Journal No.; each journal must balance and is posted as a manual entry.">
        <Link href="/general-ledger/journal-entries/bulk-posting/journal-entries" className={linkButton} data-slot="button" data-size="default">
          Upload Journal Entries
        </Link>
      </Tile>
      <Tile title="Automatically Pass Retained Earnings" text="Move a year's surplus or deficit to Retained Earnings without closing the year.">
        <Link href="/general-ledger/journal-entries/bulk-posting/retained-earnings" className={linkButton} data-slot="button" data-size="default">
          Pass Retained Earnings
        </Link>
      </Tile>
      <Tile title="Import from Tally" text="Bring in groups, ledgers and vouchers exported from Tally.">
        <Link href="/accounts?import=tally" className={linkButton} data-slot="button" data-size="default">
          Import from Tally
        </Link>
      </Tile>
    </div>
  );
}
