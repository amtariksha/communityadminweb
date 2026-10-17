import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatDate } from '@/lib/utils';
import { CardState, DASH, DashCard, type BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';

/**
 * The society's own newest published announcements. Each item opens the
 * Announcements list: that page has no per-announcement link yet.
 */
export function LatestUpdatesCard({ status, summary }: BandProps): ReactNode {
  const updates = summary?.latest_updates;
  return (
    <DashCard title="Latest Updates">
      <CardState status={status}>
        {!updates ? (
          <p>{DASH}</p>
        ) : updates.length === 0 ? (
          <p className="text-muted-foreground">No announcements yet</p>
        ) : (
          <ul className="space-y-1">
            {updates.map((update) => (
              <li key={update.id} className="flex items-baseline justify-between gap-2">
                <Link href={DASHBOARD_ROUTES.announcements} className="hover:underline">
                  {update.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(update.published_at)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={DASHBOARD_ROUTES.announcements} className="text-sm text-primary hover:underline">
          View all
        </Link>
      </CardState>
    </DashCard>
  );
}
