'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvent } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventForm } from '../../../../events/components/event-form';
import { TicketTypeGrid } from '../../../../events/components/ticket-type-grid';

const EVENTS = '/amenities/setup/events';

// Amenity & Event › Edit Event (classic, AMEN-12, screen AMEN-S4 as a page).
export default function Page(): ReactNode {
  const router = useRouter();
  const { eventId } = useParams<{ eventId: string }>();
  const eventQuery = useEvent(eventId);
  if (eventQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!eventQuery.data) {
    return (
      <p className="text-sm">
        Event not found.{' '}
        <Link href={EVENTS} className="text-primary hover:underline">
          Back to Events
        </Link>
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <EventForm key={eventQuery.data.id} mode="page" event={eventQuery.data} onClose={() => router.push(EVENTS)} onSaved={() => router.push(EVENTS)} />
      {/* AMEN-43 — the event's tickets, saved on their own. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets</CardTitle>
          <p className="text-sm text-muted-foreground">Member and guest prices per slot; each purchase is invoiced to the buyer&apos;s flat.</p>
        </CardHeader>
        <CardContent>
          <TicketTypeGrid eventId={eventQuery.data.id} />
        </CardContent>
      </Card>
    </div>
  );
}
