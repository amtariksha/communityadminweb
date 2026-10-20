'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ShowLogsButton } from '@/components/show-logs';
import { useAdminLayout } from '@/lib/layout-context';
import { cn } from '@/lib/utils';

/**
 * Community Forms pages in the standard layout: one sidebar item, the
 * module's pages as tabs. In classic the module frame draws the title,
 * sub-tabs, Create Form and Show Logs from the menu (SB-03).
 */
export const FORM_TABS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/community-forms/setup/forms', label: 'Setup Community Form' },
  { href: '/community-forms/setup/approvers', label: 'Approvers Setup' },
];

const TAB = '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors';

function StandardTabs(): ReactNode {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Community Forms" className="flex flex-wrap border-b">
      {FORM_TABS.map((tab) => {
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

export interface FormsPageProps {
  title: string;
  logs?: readonly string[];
  /** Standard layout only: classic has them in the frame (e.g. Create Form). */
  standardActions?: ReactNode;
  children: ReactNode;
}

export function FormsPage({ title, logs, standardActions, children }: FormsPageProps): ReactNode {
  const layout = useAdminLayout();
  if (layout === 'classic') return <div className="space-y-4">{children}</div>;
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Community Forms', href: FORM_TABS[0].href }, { label: title }]}
        actions={
          <div className="flex flex-wrap gap-2">
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
