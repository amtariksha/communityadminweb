import { Suspense, type ReactNode } from 'react';
import { InventoryBulkUpload } from './inventory-bulk-upload';

// Asset & Inventory › Inventory › Bulk Upload (ASSET-15, ASSET-S14).
export default function InventoryBulkUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <InventoryBulkUpload />
    </Suspense>
  );
}
