'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SLOT_PICKER_LIMIT, useSlots } from '@/hooks/use-parking';
import { SlotForm } from './slot-form';

const SLOTS = '/parking/slots';

/** Parking Manager › Slots › Add Slot as a page (PARK-07). */
export function AddSlotPage(): ReactNode {
  const router = useRouter();
  const back = () => router.push(SLOTS);
  return <SlotForm mode="page" onClose={back} onSaved={back} />;
}

/** Parking Manager › Slots › Edit Slot as a page; the slot is read from the slot list. */
export function EditSlotPage({ slotId }: { slotId: string }): ReactNode {
  const router = useRouter();
  const slots = useSlots({ limit: SLOT_PICKER_LIMIT });
  const back = () => router.push(SLOTS);
  if (slots.isLoading) return <Skeleton className="h-64 w-full" />;
  const slot = slots.data?.find((candidate) => candidate.id === slotId);
  if (!slot) return <p className="text-sm text-muted-foreground">This slot could not be found.</p>;
  return <SlotForm key={slot.id} mode="page" slot={slot} onClose={back} onSaved={back} />;
}
