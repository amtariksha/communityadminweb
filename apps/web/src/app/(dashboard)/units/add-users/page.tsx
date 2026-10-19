'use client';

import { type ReactNode } from 'react';
import { useAdminLayout } from '@/lib/layout-context';
import ImportContent from '../import/import-content';
import { AddUsersContent } from './add-users-content';

// Units & Users › Add Users (classic, UNIT-14). The standard layout keeps
// today's import screen at this address.
export default function AddUsersPage(): ReactNode {
  const layout = useAdminLayout();
  return layout === 'classic' ? <AddUsersContent /> : <ImportContent />;
}
