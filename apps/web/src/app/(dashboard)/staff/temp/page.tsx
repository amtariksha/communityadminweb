import { type ReactNode } from 'react';
import { StaffStatusList } from '../status-list/staff-status-list';

// Staff Manager › Temp (STAFF-40). The list reads its status from this route.
export default function Page(): ReactNode {
  return <StaffStatusList />;
}
