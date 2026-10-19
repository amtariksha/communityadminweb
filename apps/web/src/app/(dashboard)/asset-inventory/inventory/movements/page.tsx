import { type ReactNode } from 'react';
import { InventoryContent } from '../../../inventory/inventory-content';

// Asset & Inventory › Inventory › Movement Log (ASSET-S16): every item's movements.
export default function Page(): ReactNode {
  return <InventoryContent tabs={['logs']} />;
}
