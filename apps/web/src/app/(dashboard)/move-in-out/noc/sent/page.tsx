import { type ReactNode } from 'react';
import { NocContent } from '../noc-content';

// Move In/Out Tracker › NOC Sent (MOVE-18, screen MOVE-S11).
export default function Page(): ReactNode {
  return <NocContent state="sent" />;
}
