'use client';

import { useMemo, type ReactNode } from 'react';
import { currentRole } from '@/lib/current-role';
import { SHIFT_SAVE_ROLES, ShiftManagementCard } from './shift-management-card';
import { CategoriesBlock } from './categories-block';
import { DeviceBlock, IdCardBlock } from './badge-blocks';

// The roles PATCH /tenant-settings/staff accepts (STAFF-43).
const BADGE_SAVE_ROLES = new Set(['super_admin', 'community_admin']);

/**
 * Staff Manager › Setup (STAFF-S1), four blocks each with its own save: 1
 * the society's staff categories (STAFF-41), 2 the ID card header image and
 * badge back text (STAFF-43), 3 Staff Shift Management (STAFF-11) and 4
 * Device Management (read-only).
 */
export function SetupContent(): ReactNode {
  const role = useMemo(() => currentRole(), []);
  const editable = role !== null && SHIFT_SAVE_ROLES.has(role);
  return (
    <div className="space-y-4">
      <CategoriesBlock editable={editable} />
      <IdCardBlock editable={role !== null && BADGE_SAVE_ROLES.has(role)} />
      <ShiftManagementCard />
      <DeviceBlock />
    </div>
  );
}
