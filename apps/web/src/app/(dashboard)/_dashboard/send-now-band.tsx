'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { currentMenuRole } from '@/components/layout/classic/use-classic-menu';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotificationChannels } from '@/hooks';
import type { BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';
import { useDashboardAccess } from './use-dashboard-access';

export interface SendTile {
  title: string;
  text: string;
  href: string;
  /** Roles that may use the tile's target (the API's own lists). */
  roles: ReadonlySet<string>;
  /** Shown only once SMS is set up (DASH-10). */
  needsSms?: true;
}

// POST /notifications/templates (Broadcast) and POST /announcements.
const BROADCAST_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'committee_member']);
const ANNOUNCEMENT_ROLES: ReadonlySet<string> = new Set([...BROADCAST_ROLES, 'accountant']);

// Their dashboard starts with three "send now" tiles, in this order (ANN-S8).
const TILES: readonly SendTile[] = [
  {
    title: 'SMS',
    text: 'Text residents now.',
    href: DASHBOARD_ROUTES.composeSms,
    roles: BROADCAST_ROLES,
    needsSms: true,
  },
  {
    title: 'Instant Notification',
    text: 'Push a message to residents right now.',
    href: DASHBOARD_ROUTES.composePush,
    roles: BROADCAST_ROLES,
  },
  {
    title: 'Post Announcement',
    text: 'Publish a notice to the society.',
    href: DASHBOARD_ROUTES.newAnnouncement,
    roles: ANNOUNCEMENT_ROLES,
  },
];

/**
 * The tiles a user sees: their role may use the target, its screen is open
 * to them, and — for SMS — SMS is set up on the server (ANN-09, DASH-10).
 */
export function sendNowTiles(opts: {
  role: string | undefined;
  smsAvailable: boolean;
  canOpen: (href: string) => boolean;
}): SendTile[] {
  return TILES.filter(
    (tile) =>
      opts.role !== undefined &&
      tile.roles.has(opts.role) &&
      opts.canOpen(tile.href) &&
      (!tile.needsSms || opts.smsAvailable),
  );
}

function Tiles({ tiles }: { tiles: readonly SendTile[] }): ReactNode {
  if (tiles.length === 0) return null;
  return (
    <section aria-label="Send now" className="space-y-2">
      <h2 className="sr-only">Send now</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.title}>
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-semibold">{tile.title}</p>
                <p className="text-sm text-muted-foreground">{tile.text}</p>
              </div>
              <Link href={tile.href} className={buttonVariants({ size: 'sm' })} aria-label={`Send ${tile.title}`}>
                Send
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/** Classic dashboard: the send-now row; none for a role that sends nothing (D11). */
export function SendNowBand({ access }: Pick<BandProps, 'access'>): ReactNode {
  const channels = useNotificationChannels(access.publishes);
  if (!access.publishes) return null;
  return <Tiles tiles={sendNowTiles({ role: currentMenuRole(), smsAvailable: channels.data?.sms ?? false, canOpen: access.canOpen })} />;
}

/** Standard dashboard (ANN-09): the same three tiles above the cards. */
export function StandardSendNow(): ReactNode {
  const access = useDashboardAccess();
  return <SendNowBand access={access} />;
}
