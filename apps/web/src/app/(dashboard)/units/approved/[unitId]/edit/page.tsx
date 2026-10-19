'use client';

import { useParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { UnitEditPage } from '../../unit-edit-page';

// Units & Users › Approved Users › View/Edit Unit details (UNIT-S6, classic).
export default function Page(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  return <UnitEditPage key={unitId} unitId={unitId} />;
}
