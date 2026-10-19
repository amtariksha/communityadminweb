'use client';

import { useParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { UnitFiles } from './unit-files';

// Admin Files › Unit Specific Files › one unit's files (FILE-S6, FILE-12).
export default function Page(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  return <UnitFiles unitId={unitId} />;
}
