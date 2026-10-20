import { type ReactNode } from 'react';
import { FieldsSetup } from '../fields-setup';

// Move In/Out Tracker › Setup › Custom Fields For Move-out (MOVE-S5).
export default function Page(): ReactNode {
  return <FieldsSetup phase="out" />;
}
