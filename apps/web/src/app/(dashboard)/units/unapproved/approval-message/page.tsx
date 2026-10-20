import { type ReactNode } from 'react';
import { ResidentMessagePage } from '../../components/resident-message-page';

// Units & Users › Unapproved Users › Customize Approval Email (UNIT-21, screen UNIT-S2).
export default function Page(): ReactNode {
  return <ResidentMessagePage kind="approval" />;
}
