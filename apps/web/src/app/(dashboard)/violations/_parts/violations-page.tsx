'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ShowLogsButton } from '@/components/show-logs';
import { useAdminLayout } from '@/lib/layout-context';
import { cn } from '@/lib/utils';

/**
 * The pages of Community Rules & Violations in the standard layout: one
 * sidebar item, the module's pages as tabs. In classic the module frame
 * draws the title, sub-tabs and Show Logs from the menu (SB-03), so only
 * the content renders.
 */
export const STANDARD_TABS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/violations/open/awaiting-approval', label: 'Awaiting Approval' },
  { href: '/violations/open/warning', label: 'Warning' },
  { href: '/violations/open/penalty', label: 'Penalty' },
  { href: '/violations/closed', label: 'Closed Violations' },
  { href: '/violations/setup/approvers', label: 'Approvers Set Up' },
  { href: '/violations/setup/categories', label: 'Category Set Up' },
];

const TAB = '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors';

function StandardTabs(): ReactNode {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Rules & Violations" className="flex flex-wrap border-b">
      {STANDARD_TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(TAB, active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface ViolationsPageProps {
  title: string;
  /** Audit record types for Show Logs in the standard header; classic takes them from the menu. */
  logs?: readonly string[];
  actions?: ReactNode;
  /** Standard layout only: in classic the module frame has them (e.g. Create Violation). */
  standardActions?: ReactNode;
  children: ReactNode;
}

export function ViolationsPage({ title, logs, actions, standardActions, children }: ViolationsPageProps): ReactNode {
  const layout = useAdminLayout();
  if (layout === 'classic') {
    return (
      <div className="space-y-4">
        {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
        {children}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Rules & Violations', href: STANDARD_TABS[0].href }, { label: title }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {actions}
            {standardActions}
            {logs && logs.length > 0 && <ShowLogsButton recordTypes={logs} />}
          </div>
        }
      />
      <StandardTabs />
      {children}
    </div>
  );
}
