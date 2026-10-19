import { type ReactNode } from 'react';
import { PartyList } from '../../party-list';

// Vendor Master › Vendors for Non Member Income (VEND-S3, VEND-07). Active / In-Active from the route.
export default function Page(): ReactNode {
  return <PartyList kind="income" />;
}
