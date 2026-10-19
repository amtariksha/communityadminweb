'use client';

import { type ReactNode } from 'react';
import { ASSETS_BASE } from '@/lib/asset-statuses';
import { ChangeLog } from '../../change-log';

// Asset & Inventory › Assets › View User Edits (ASSET-S8, ASSET-10).
export default function Page(): ReactNode {
  return (
    <ChangeLog
      recordTypes={['asset', 'amc_contract']}
      recordLabel="Asset"
      recordHref={(entry) => (entry.entity_type === 'asset' && entry.action !== 'delete' && entry.entity_id ? `${ASSETS_BASE}/${entry.entity_id}` : undefined)}
    />
  );
}
