'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { ImportDoors } from '@/components/import/import-doors';
import { ImportLog } from '@/components/import/import-log';
import { Button } from '@/components/ui/button';
import { canWriteFinance } from '@/lib/finance-roles';
import { VENDOR_UPLOADS } from './vendor-imports';

/** One list's upload of Add Vendors in Bulk (VEND-S4): Excel or the grid, then the recent uploads. */
export function VendorUploadPage({ list }: { list: keyof typeof VENDOR_UPLOADS }): ReactNode {
  const router = useRouter();
  const upload = VENDOR_UPLOADS[list];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.push('/vendor-master/bulk-posting')}>
          Close
        </Button>
      </div>
      <ImportDoors target={upload.target} title={upload.title} description={upload.description} columns={upload.columns} applyLabel="Add" allowed={canWriteFinance()} />
      <ImportLog endpoint={upload.target.endpoint} type={upload.target.type} labels={{ [upload.target.type]: upload.title }} />
    </div>
  );
}
