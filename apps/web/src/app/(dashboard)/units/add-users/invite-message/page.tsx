import { type ReactNode } from 'react';
import { ResidentMessagePage } from '../../components/resident-message-page';

// Units & Users › Add Users › Customize Invite Email (UNIT-20).
export default function Page(): ReactNode {
  return <ResidentMessagePage kind="invite" />;
}
