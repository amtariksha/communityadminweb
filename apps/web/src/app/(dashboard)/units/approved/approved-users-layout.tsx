'use client';

import { useParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { useAdminLayout } from '@/lib/layout-context';
import { UnitList } from './unit-list';

/**
 * Approved Users in classic is master–detail (UNIT-12): the unit list on the
 * left stays put while the unit on the right changes with the URL. The
 * standard layout keeps today's unit screen, so it gets the page alone.
 */
export function ApprovedUsersLayout({ children }: { children: ReactNode }): ReactNode {
  const layout = useAdminLayout();
  const params = useParams<{ unitId?: string }>();
  if (layout !== 'classic') return <>{children}</>;
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-w-0">
        <UnitList selectedUnitId={params?.unitId ?? null} />
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
