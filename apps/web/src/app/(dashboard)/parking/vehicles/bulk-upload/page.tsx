import { Suspense, type ReactNode } from 'react';
import { ParkingBulkUpload } from './bulk-upload-content';

// Parking Manager › Vehicles › Bulk Upload (PARK-11, PARK-S6).
export default function ParkingBulkUploadPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ParkingBulkUpload />
    </Suspense>
  );
}
