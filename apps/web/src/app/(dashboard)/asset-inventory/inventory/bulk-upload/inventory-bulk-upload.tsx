'use client';

import { type ReactNode } from 'react';
import { ImportDoors } from '@/components/import/import-doors';
import { ImportLog } from '@/components/import/import-log';
import { currentRole } from '@/lib/current-role';

const TARGET = { endpoint: '/inventory/imports', type: 'materials' } as const;
const COLUMNS = [
  { key: 'name', label: 'Inventory Name' },
  { key: 'unit', label: 'Unit' },
  { key: 'vendor_name', label: 'Vendor Name' },
  { key: 'category', label: 'Inventory Category' },
  { key: 'location', label: 'Location' },
  { key: 'minimum_stock', label: 'Re-order Level' },
  { key: 'reorder_quantity', label: 'Re-order Quantity' },
  { key: 'unit_price', label: 'Cost per unit' },
  { key: 'opening_stock', label: 'Opening stock' },
] as const;
// The roles that add items and move stock (POST /inventory/materials).
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member', 'accountant', 'facility_supervisor']);

/** Asset & Inventory › Inventory › Bulk Upload (ASSET-15, screen ASSET-S14). */
export function InventoryBulkUpload(): ReactNode {
  return (
    <div className="space-y-4">
      <ImportDoors
        target={TARGET}
        title="Bulk Upload Inventory"
        description="One row per item; the opening stock is booked as an IN movement. A name already used, or any row with an error, stops the upload until it is fixed or removed."
        columns={COLUMNS}
        applyLabel="Add"
        allowed={WRITE_ROLES.has(currentRole() ?? '')}
      />
      <ImportLog endpoint={TARGET.endpoint} labels={{ materials: 'Inventory items' }} />
    </div>
  );
}
