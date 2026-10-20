import { type ReactNode } from 'react';
import { AccessPeople } from '../access-people';

// Units & Users › Access Control › Office Staff (UNIT-22 / UNIT-23, screen UNIT-S9).
export default function Page(): ReactNode {
  return <AccessPeople kind="office_staff" />;
}
