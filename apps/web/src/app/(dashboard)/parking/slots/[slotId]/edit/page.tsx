import { type ReactNode } from 'react';
import { EditSlotPage } from '../../../components/slot-form-page';

// Parking Manager › Slots › Edit Slot (PARK-07, screen PARK-S3).
export default async function Page({ params }: { params: Promise<{ slotId: string }> }): Promise<ReactNode> {
  const { slotId } = await params;
  return <EditSlotPage slotId={slotId} />;
}
