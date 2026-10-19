import { type ReactNode } from 'react';
import { AssetStatusList } from '../asset-status-list';

// Asset & Inventory › Assets › active (ASSET-07). The list reads its status from this route (SB-05).
export default function Page(): ReactNode {
  return <AssetStatusList />;
}
