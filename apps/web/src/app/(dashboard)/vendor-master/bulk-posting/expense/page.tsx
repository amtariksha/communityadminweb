import { Suspense, type ReactNode } from 'react';
import { VendorUploadPage } from '../vendor-upload-page';

// Vendor Master › Bulk Posting › Vendors For Expense (VEND-09, VEND-S4).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <VendorUploadPage list="expense" />
    </Suspense>
  );
}
