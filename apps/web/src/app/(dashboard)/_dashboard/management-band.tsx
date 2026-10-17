import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BandHeading, type BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';

const BUTTONS = [
  { label: 'Book Facilities', href: DASHBOARD_ROUTES.bookFacilities },
  { label: 'Create Meeting', href: DASHBOARD_ROUTES.newMeeting },
  { label: 'Create Announcement', href: DASHBOARD_ROUTES.newAnnouncement },
] as const;

// Society Profile opens Settings until its own screen exists (PROF);
// Admin Reports has no screen yet (REP), so its tile stays hidden.
const TILES = [
  { label: 'Vendor Master', href: DASHBOARD_ROUTES.vendors },
  { label: 'Admin Files', href: DASHBOARD_ROUTES.documents },
  { label: 'Society Profile', href: DASHBOARD_ROUTES.settings },
  { label: 'Admin Reports', href: DASHBOARD_ROUTES.adminReports },
] as const;

export function ManagementBand({ access }: Pick<BandProps, 'access'>): ReactNode {
  const buttons = BUTTONS.filter((button) => access.canOpen(button.href));
  const tiles = TILES.filter((tile) => access.canOpen(tile.href));
  if (buttons.length === 0 && tiles.length === 0) return null;
  return (
    <section aria-label="Management" className="space-y-2">
      <BandHeading>MANAGEMENT</BandHeading>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <Link key={button.label} href={button.href} className={buttonVariants({ size: 'sm' })}>
            {button.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6 text-center font-semibold">{tile.label}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
