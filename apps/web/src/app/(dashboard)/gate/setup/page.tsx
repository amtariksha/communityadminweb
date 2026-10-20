import { type ReactNode } from 'react';
import { GateSetupContent } from './setup-content';

// Gate & Visitors › Setup (GATE-S1): the guard-app switches, the check-in
// alert, the gates grid and overstay / auto check-out, each saved on its own.
export default function Page(): ReactNode {
  return <GateSetupContent />;
}
