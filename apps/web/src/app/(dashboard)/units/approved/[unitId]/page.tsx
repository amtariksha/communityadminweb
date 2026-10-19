'use client';

import { useParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { UnitPanel } from '../unit-panel';

// Units & Users › Approved Users › one unit (UNIT-S5), so a unit can be bookmarked.
export default function Page(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  return <UnitPanel key={unitId} unitId={unitId} />;
}
