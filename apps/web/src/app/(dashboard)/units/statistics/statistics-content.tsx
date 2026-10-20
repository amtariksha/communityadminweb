'use client';

import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdoptionStats } from '@/hooks/use-adoption';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { InviteCandidates } from './invite-candidates';

function societyName(): string {
  const tenantId = getCurrentTenant();
  const society = getUser()?.societies.find((candidate) => candidate.id === tenantId);
  return society?.display_name || society?.name || 'Society';
}

/** Units & Users › Statistics (UNIT-31 / UNIT-S12): app adoption and re-invites. */
export function StatisticsContent(): ReactNode {
  const stats = useAdoptionStats();
  if (stats.isLoading) return <Skeleton className="h-48 w-full" />;
  if (stats.data === null) return <p className="text-sm text-muted-foreground">Statistics are not available yet on this server.</p>;
  if (!stats.data) return <p className="text-sm text-destructive">Could not load the statistics.</p>;
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{societyName()} App Statistics</h2>
      <ul aria-label="App usage" className="space-y-1 text-sm">
        {stats.data.ratios.map((ratio) => (
          <li key={ratio.key}>
            <span className="font-medium">{ratio.label}:</span> {ratio.count} in {ratio.of}
          </li>
        ))}
      </ul>
      <table aria-label="Categories" className="w-full max-w-md text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">Category</th>
            <th className="py-1 text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          {stats.data.categories.map((category) => (
            <tr key={category.key} className="border-b">
              <td className="py-1">{category.label}</td>
              <td className="py-1 text-right">{category.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <InviteCandidates />
    </div>
  );
}
