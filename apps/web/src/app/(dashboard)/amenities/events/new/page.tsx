'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { EventForm } from '../../../events/components/event-form';

const EVENTS = '/amenities/setup/events';

// Amenity & Event › Add Event (classic, AMEN-12, screen AMEN-S4 as a page).
export default function Page(): ReactNode {
  const router = useRouter();
  return <EventForm mode="page" onClose={() => router.push(EVENTS)} onSaved={() => router.push(EVENTS)} />;
}
