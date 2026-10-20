import { type ReactNode } from 'react';
import { AccessPeople } from '../access-people';

// Units & Users › Access Control › Management Committee (UNIT-22 / UNIT-23, screen UNIT-S8).
export default function Page(): ReactNode {
  return <AccessPeople kind="committee" />;
}
