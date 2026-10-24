import Link from 'next/link';
import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function StaffReportsPage(): ReactNode {
  // STAFF-31: reports 5, 6, 7 and 9 also print as cards with the header image, photos and QR.
  return (
    <ModuleReportsPage
      module="staff_manager"
      footer={
        <span className="flex flex-wrap gap-4">
          <Link href="/staff/reports/badges" className="text-primary underline">
            Print badges (cards with the ID card header, photos and QR)
          </Link>
          <Link href="/staff/reports/badges/scans" className="text-primary underline">
            Badge scans at the gate
          </Link>
        </span>
      }
    />
  );
}
