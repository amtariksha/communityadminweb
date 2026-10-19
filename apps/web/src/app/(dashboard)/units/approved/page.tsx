import { Suspense, type ReactNode } from 'react';
import { ApprovedUsersIndex } from './approved-users-index';

// Units & Users › Approved Users (classic route, UNIT-10 / UNIT-12).
export default function ApprovedUsersPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ApprovedUsersIndex />
    </Suspense>
  );
}
