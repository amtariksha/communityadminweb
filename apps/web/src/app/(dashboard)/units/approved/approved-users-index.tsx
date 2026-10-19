'use client';

import { type ReactNode } from 'react';
import { useAdminLayout } from '@/lib/layout-context';
import UnitsContent from '../units-content';

/** /units/approved: classic asks for a unit; standard shows today's unit screen. */
export function ApprovedUsersIndex(): ReactNode {
  const layout = useAdminLayout();
  if (layout !== 'classic') return <UnitsContent />;
  return <p className="text-sm text-muted-foreground">Select a unit on the left.</p>;
}
