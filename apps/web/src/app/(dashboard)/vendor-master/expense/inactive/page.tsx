import { type ReactNode } from 'react';
import { PartyList } from '../../party-list';

// Vendor Master › Vendors For Expense (VEND-S1, VEND-06). Active / In-Active from the route.
export default function Page(): ReactNode {
  return <PartyList kind="expense" />;
}
