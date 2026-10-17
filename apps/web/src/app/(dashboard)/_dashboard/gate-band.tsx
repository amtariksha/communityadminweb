import type { ReactNode } from 'react';
import { BandHeading, CardState, DASH, DashCard, type BandProps } from './card-parts';
import { DASHBOARD_ROUTES } from './routes';

/** Our real gate figures; the band is hidden when the gate feature is off. */
export function GateBand({ status, summary, access }: BandProps): ReactNode {
  if (!access.canOpen(DASHBOARD_ROUTES.gate)) return null;
  const gate = summary?.gate;
  return (
    <section aria-label="Gate and visitors" className="space-y-2">
      <BandHeading>GATE &amp; VISITORS</BandHeading>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DashCard title="Gate & Visitors" href={DASHBOARD_ROUTES.gate}>
          <CardState status={status}>
            <p>{`Visitors today: ${gate ? gate.visitors_today : DASH}`}</p>
            <p>{`Staff entries today: ${gate ? gate.staff_today : DASH}`}</p>
            <p>{`Open overstay alerts: ${gate ? gate.open_overstays : DASH}`}</p>
          </CardState>
        </DashCard>
      </div>
    </section>
  );
}
