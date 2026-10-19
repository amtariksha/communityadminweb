import { type ReactNode } from 'react';
import { ExpiredInventory } from '../expired-inventory';

// Asset & Inventory › Inventory › Expired (ASSET-S13, ASSET-12), classic layout.
export default function Page(): ReactNode {
  return <ExpiredInventory />;
}
