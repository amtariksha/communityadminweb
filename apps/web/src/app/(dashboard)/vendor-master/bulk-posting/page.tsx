import Link from 'next/link';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';

// Vendor Master › Bulk Posting › Add Vendors in Bulk (VEND-09, screen VEND-S4).
export default function VendorBulkPostingPage(): ReactNode {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add Vendors in Bulk</h2>
      <div className="flex flex-wrap gap-3">
        <Link href="/vendor-master/bulk-posting/expense" className={buttonVariants()}>
          Vendors For Expense
        </Link>
        <Link href="/vendor-master/bulk-posting/non-member-income" className={buttonVariants({ variant: 'outline' })}>
          Vendors For Non Member Income
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">Each opens the template, the upload or a grid to type in, and a preview with every row checked before anything is added.</p>
    </div>
  );
}
