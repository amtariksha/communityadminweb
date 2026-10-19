'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useHelpdeskAssignees } from '@/hooks';
import { useAdminLayout } from '@/lib/layout-context';
import { cn } from '@/lib/utils';

const SETUP_PAGES = [
  { key: 'categories', label: 'Helpdesk Categories', href: '/helpdesk/setup/categories' },
  { key: 'service-date', label: 'Preferred Service Date', href: '/helpdesk/setup/service-date' },
  { key: 'notifications', label: 'Notification Alerts', href: '/helpdesk/setup/notifications' },
  { key: 'auto-responses', label: 'Automated Responses', href: '/helpdesk/setup/auto-responses' },
  { key: 'escalation', label: 'Escalation', href: '/helpdesk/escalation' },
] as const;

export type SetupPageKey = (typeof SETUP_PAGES)[number]['key'];

/**
 * Links between the helpdesk setup pages for the standard layout. The
 * classic layout already shows them as sub-tabs of the module frame.
 * They appear once the server answers the setup endpoints, so nobody is
 * sent to a screen that an older server cannot serve.
 */
export function SetupLinks({ current }: { current: SetupPageKey }): ReactNode {
  const layout = useAdminLayout();
  const serverReady = useHelpdeskAssignees().isSuccess;
  if (layout === 'classic' || !serverReady) return null;
  return (
    <nav aria-label="Helpdesk setup" className="flex flex-wrap gap-1 border-b">
      {SETUP_PAGES.map((page) => (
        <Link
          key={page.key}
          href={page.href}
          aria-current={page.key === current ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
            page.key === current
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
