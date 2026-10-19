import { type ReactNode } from 'react';
import { StaffStatusList } from '../status-list/staff-status-list';

// Staff Manager › Active (STAFF-10). The list reads its status from this route.
export default function Page(): ReactNode {
  return <StaffStatusList />;
}
