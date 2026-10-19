'use client';

import { type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { RenameUnitForm } from '@/components/track-units/rename-unit-form';

// Income Tracker › Track Units › Rename (INC-S15), a form as a page (SB-07).
export default function RenameUnitPage(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  return <RenameUnitForm unitId={unitId} />;
}
