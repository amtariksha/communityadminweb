import { Suspense, type ReactNode } from 'react';
import { AssetsBulkUpload } from './assets-bulk-upload';

// Asset & Inventory › Assets › Bulk Upload (ASSET-15, ASSET-S7).
export default function AssetsBulkUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <AssetsBulkUpload />
    </Suspense>
  );
}
