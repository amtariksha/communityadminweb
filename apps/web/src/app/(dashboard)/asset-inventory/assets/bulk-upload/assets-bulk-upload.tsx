'use client';

import { type ReactNode } from 'react';
import { ImportDoors } from '@/components/import/import-doors';
import { ImportLog } from '@/components/import/import-log';
import { currentRole } from '@/lib/current-role';

const TARGET = { endpoint: '/assets/imports', type: 'assets' } as const;
const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'asset_code', label: 'Asset Code' },
  { key: 'location', label: 'Location' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'model', label: 'Model' },
  { key: 'serial_number', label: 'Serial Number' },
  { key: 'purchase_date', label: 'Purchase Date' },
  { key: 'purchase_cost', label: 'Purchase Cost' },
  { key: 'warranty_expiry', label: 'Warranty Expiry' },
  { key: 'condition', label: 'Condition' },
  { key: 'status', label: 'Status' },
] as const;
// The roles that add assets (POST /assets).
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'accountant', 'committee_member']);

/** Asset & Inventory › Assets › Bulk Upload (ASSET-15, screen ASSET-S7). */
export function AssetsBulkUpload(): ReactNode {
  return (
    <div className="space-y-4">
      <ImportDoors
        target={TARGET}
        title="Bulk Upload Assets"
        description="One row per asset. Category is one of the asset types (Lift, Fire Safety, DG Set, CCTV …); a blank Asset Code takes the next AST- number. Any row with an error stops the upload until it is fixed or removed."
        columns={COLUMNS}
        applyLabel="Add"
        allowed={WRITE_ROLES.has(currentRole() ?? '')}
      />
      <ImportLog endpoint={TARGET.endpoint} labels={{ assets: 'Assets' }} />
    </div>
  );
}
