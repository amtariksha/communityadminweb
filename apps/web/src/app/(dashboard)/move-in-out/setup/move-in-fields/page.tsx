import { type ReactNode } from 'react';
import { FieldsSetup } from '../fields-setup';

// Move In/Out Tracker › Setup › Custom Fields For Move-in (MOVE-S4).
export default function Page(): ReactNode {
  return <FieldsSetup phase="in" />;
}
