import { type ReactNode } from 'react';
import { ApprovedUsersLayout } from './approved-users-layout';

export default function Layout({ children }: { children: ReactNode }): ReactNode {
  return <ApprovedUsersLayout>{children}</ApprovedUsersLayout>;
}
