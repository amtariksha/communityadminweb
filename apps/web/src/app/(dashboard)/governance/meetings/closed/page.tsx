import { type ReactNode } from 'react';
import { MeetingsList } from '../meetings-list';

// Projects & Meetings › Meetings › Closed (PROJ-S7), classic layout (PROJ-10).
// The list reads its state from this route (SB-05).
export default function Page(): ReactNode {
  return <MeetingsList />;
}
