'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { JournalEntriesList } from '../general-ledger/journal-entries/journal-entries-list';
import AccountsContent from './accounts-content';

const TABS = [
  { key: 'chart', label: 'Chart of Accounts', href: '/accounts' },
  { key: 'entries', label: 'Journal Entries', href: '/accounts?tab=entries' },
] as const;

/**
 * /accounts: the chart of accounts, and the posted journal entries with
 * live filters (GL-10; the classic layout has them as Old Journal Entries).
 */
export function AccountsTabs(): ReactNode {
  const tab = useSearchParams()?.get('tab') === 'entries' ? 'entries' : 'chart';
  return (
    <div className="space-y-4">
      <nav aria-label="Accounts" className="flex gap-1 border-b">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={tab === item.key ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === item.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {tab === 'entries' ? <JournalEntriesList mode="live" /> : <AccountsContent />}
    </div>
  );
}
