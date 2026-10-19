import Link from 'next/link';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MEMBER_INCOME_BASE } from './member-row-actions';

/**
 * Member Income's sub-links (INC-S16, INC-35): SubLedgers · Unidentified
 * Collection · Bulk Posting · Bulk Corrections. A link whose screen has not
 * shipped is left out (`shipped: false`).
 */
export const MEMBER_INCOME_LINKS: ReadonlyArray<{ label: string; href: string; shipped: boolean }> = [
  { label: 'SubLedgers', href: MEMBER_INCOME_BASE, shipped: true },
  { label: 'Unidentified Collection', href: `${MEMBER_INCOME_BASE}/unidentified`, shipped: false },
  { label: 'Bulk Posting', href: `${MEMBER_INCOME_BASE}/bulk-posting`, shipped: false },
  { label: 'Bulk Corrections', href: `${MEMBER_INCOME_BASE}/bulk-corrections`, shipped: false },
];

export function MemberIncomeLinks({ current }: { current: string }): ReactNode {
  return (
    <nav aria-label="Member Income" className="flex flex-wrap gap-3 text-sm">
      {MEMBER_INCOME_LINKS.filter((link) => link.shipped).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === current ? 'page' : undefined}
          className={cn('text-primary hover:underline', link.href === current && 'font-semibold underline')}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
