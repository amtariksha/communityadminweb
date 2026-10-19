'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAllLedgerAccounts } from '@/hooks/use-chart-of-accounts';
import { ImportBalancesDialog } from '../../../accounts/import-balances-dialog';

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
 * General Ledger › Journal Entries › Bulk Posting (GL-S8, GL-09). Uploads
 * of opening balances and journal entries from Excel are GL-24; today's
 * CSV opening-balance import and the Tally import are offered meanwhile.
 */
export function BulkPostingPage(): ReactNode {
  const accounts = useAllLedgerAccounts().data ?? [];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tile title="Batch Upload Opening Balances" text="Upload a CSV of account codes and opening balances; each change posts an opening-balance entry.">
        <ImportBalancesDialog accounts={accounts} />
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
