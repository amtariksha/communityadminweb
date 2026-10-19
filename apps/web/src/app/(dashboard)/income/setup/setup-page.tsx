'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { canChangeSettings } from '../../settings/settings-access';

interface IncomeSetupPageProps {
  title: string;
  description: string;
  // Society settings on this page are saved by the community admin only
  // (PATCH /tenants/:id/settings); the cards hide themselves for others.
  adminSettings?: boolean;
  children: ReactNode;
}

/**
 * One page of Income Tracker › Setup (INC-34). The classic module frame
 * draws the title and the Setup tabs, so the page header is standard only.
 * The cards are the same components as on /settings.
 */
export function IncomeSetupPage({
  title,
  description,
  adminSettings = true,
  children,
}: IncomeSetupPageProps): ReactNode {
  const classic = useAdminLayout() === 'classic';
  return (
    <div className="space-y-6">
      {classic ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : (
        <PageHeader title={title} description={description} />
      )}
      {adminSettings && !canChangeSettings() && (
        <p role="note" className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Only the society&apos;s community admin can change the settings on this page.
        </p>
      )}
      {children}
    </div>
  );
}
