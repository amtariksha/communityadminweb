import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';

interface Tile {
  title: string;
  text: string;
  href: string;
}

const TILES: readonly Tile[] = [
  {
    title: 'Instant Notification',
    text: 'Push a message to residents right now.',
    href: DASHBOARD_ROUTES.notifications,
  },
  {
    title: 'Post Announcement',
    text: 'Publish a notice to the society.',
    href: DASHBOARD_ROUTES.newAnnouncement,
  },
];

/**
 * Three "send to residents now" tiles. The SMS tile is not drawn until SMS is a
 * real channel (DASH-10); none is drawn for a role that sends nothing (D11).
 */
export function SendNowBand({ access }: Pick<BandProps, 'access'>): ReactNode {
  const tiles = access.publishes ? TILES.filter((tile) => access.canOpen(tile.href)) : [];
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
              <Link href={tile.href} className={buttonVariants({ size: 'sm' })}>
                Send
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
