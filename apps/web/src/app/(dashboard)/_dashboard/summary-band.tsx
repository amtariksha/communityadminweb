import type { ReactNode } from 'react';
import { ActionLink, CardState, DASH, DashCard, type BandProps } from './card-parts';
import { LatestUpdatesCard } from './latest-updates-card';
import { DASHBOARD_ROUTES } from './routes';

function UnitsUsersCard({ status, summary, access }: BandProps): ReactNode {
  const units = summary?.units;
  const users = summary?.users;
  return (
    <DashCard title="Units & Users">
      <CardState status={status}>
        <p>{`Units: ${units ? units.total : DASH} · ${units ? units.occupied : DASH} occupied`}</p>
        <p>{`Users: ${users ? users.members : DASH}`}</p>
        {/* "Never Logged In" joins this card with DASH-11. */}
        {users && access.canOpen(DASHBOARD_ROUTES.settings) && (
          <ActionLink href={DASHBOARD_ROUTES.settings}>{users.admins} Admins</ActionLink>
        )}
      </CardState>
    </DashCard>
  );
}

function HelpdeskCard({ status, summary, access }: BandProps): ReactNode {
  const helpdesk = summary?.helpdesk;
  return (
    <DashCard title="HelpDesk Tracker" href={DASHBOARD_ROUTES.tickets}>
      <CardState status={status}>
        <p className="font-medium">{`Open Requests: ${helpdesk ? helpdesk.open : DASH}`}</p>
        <p className="text-muted-foreground">{`${helpdesk ? helpdesk.overdue : DASH} overdue`}</p>
        {access.canOpen(DASHBOARD_ROUTES.newRequest) && (
          <ActionLink href={DASHBOARD_ROUTES.newRequest}>Create New Request</ActionLink>
        )}
      </CardState>
    </DashCard>
  );
}

/** Units & Users card, HelpDesk Tracker card and the Latest Updates panel. */
export function SummaryBand(props: BandProps): ReactNode {
  const { access } = props;
  return (
    <section aria-label="Summary" className="space-y-2">
      <h2 className="sr-only">Summary</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {access.canOpen(DASHBOARD_ROUTES.units) && <UnitsUsersCard {...props} />}
        {access.canOpen(DASHBOARD_ROUTES.tickets) && <HelpdeskCard {...props} />}
        {access.canOpen(DASHBOARD_ROUTES.announcements) && <LatestUpdatesCard {...props} />}
      </div>
    </section>
  );
}
