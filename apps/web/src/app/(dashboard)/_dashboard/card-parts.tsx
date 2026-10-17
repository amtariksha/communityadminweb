import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary } from '@/hooks/use-analytics';
import type { DashboardAccess } from './use-dashboard-access';

/** What a figure shows when its section could not be computed. */
export const DASH = '—';

export type SummaryStatus = 'loading' | 'error' | 'ready';

/** What every band receives: the request state, the figures, and what this user may open. */
export interface BandProps {
  status: SummaryStatus;
  summary?: DashboardSummary;
  access: DashboardAccess;
}

export function DashCard({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <Card data-dash-card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {href ? (
            <Link href={href} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

export function ActionLink({ href, children }: { href: string; children: ReactNode }): ReactNode {
  return (
    <Link href={href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
      {children}
    </Link>
  );
}

export function CouldNotLoad(): ReactNode {
  return <p className="text-muted-foreground">Could not load</p>;
}

export function BandHeading({ children }: { children: ReactNode }): ReactNode {
  return <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">{children}</h2>;
}

/** A card's body: the failure line when the request failed, else what the card renders. */
export function CardState({
  status,
  children,
}: {
  status: SummaryStatus;
  children: ReactNode;
}): ReactNode {
  return status === 'error' ? <CouldNotLoad /> : <>{children}</>;
}
