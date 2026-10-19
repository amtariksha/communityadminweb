'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useDashboardSummary } from '@/hooks';
import { ApiError } from '@/lib/api-error';
import { AccountingBand } from './accounting-band';
import { type SummaryStatus } from './card-parts';
import { GateBand } from './gate-band';
import { ManagementBand } from './management-band';
import { SendNowBand } from './send-now-band';
import { SummaryBand } from './summary-band';
import { useDashboardAccess } from './use-dashboard-access';

function statusOf(query: { isLoading: boolean; isError: boolean }): SummaryStatus {
  if (query.isError) return 'error';
  return query.isLoading ? 'loading' : 'ready';
}

/** 403: the society's grid switched the dashboard off for this role, or the role never had it. */
function refusedForRole(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

function DashboardOff(): ReactNode {
  return (
    <div role="status" className="space-y-1 rounded-md border p-4 text-sm">
      <p className="font-medium">The dashboard is switched off for your role.</p>
      <p className="text-muted-foreground">
        A community admin can switch it on in Settings › Roles &amp; Permissions. Your screens are in the menu.
      </p>
    </div>
  );
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * The classic landing page: module cards in bands, with the counts on the
 * buttons. One request supplies every figure; a card is drawn only if its
 * feature is on for the society and the user's role may open its screen.
 * A role whose dashboard the society switched off sees a notice instead.
 */
export function ClassicDashboard(): ReactNode {
  const summaryQuery = useDashboardSummary(undefined);
  const access = useDashboardAccess();
  if (refusedForRole(summaryQuery.error)) return <DashboardOff />;
  const band = { status: statusOf(summaryQuery), summary: summaryQuery.data, access };

  return (
    <div className="space-y-6">
      {summaryQuery.isError && (
        <div role="alert" className="flex items-center justify-between rounded-md border border-destructive/40 p-3 text-sm">
          <span>The dashboard figures could not be loaded.</span>
          <Button variant="outline" size="sm" onClick={() => summaryQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}
      <SendNowBand access={access} />
      <SummaryBand {...band} />
      <AccountingBand {...band} />
      <GateBand {...band} />
      <ManagementBand access={access} />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={scrollToTop}>
          Top
        </Button>
      </div>
    </div>
  );
}
