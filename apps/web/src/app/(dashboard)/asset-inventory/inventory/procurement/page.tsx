import { type ReactNode } from 'react';
import { InventoryContent } from '../../../inventory/inventory-content';

// Asset & Inventory › Inventory › Procurement (ASSET-S16, decision D4):
// today's Letters of Intent, Purchase Orders, Goods Received and Work Orders.
export default function Page(): ReactNode {
  return <InventoryContent tabs={['loi', 'po', 'grn', 'wo']} />;
}
