'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { PurchaseRequestForm } from '../../purchases/purchase-request-form';

export const OPEN_LIST = '/expense-tracker/purchase-workflow/open';

/**
 * /expense-tracker/purchase-workflow/new and /:id — the purchase request
 * form as a page (SB-07). Saving returns to Open Purchase Request (a draft
 * lands in Drafts); Close goes there too.
 */
export function PurchaseRequestPage({ requestId }: { requestId?: string }): ReactNode {
  const router = useRouter();
  return (
    <PurchaseRequestForm
      mode="page"
      requestId={requestId}
      onClose={() => router.push(OPEN_LIST)}
      onSaved={() => router.push(OPEN_LIST)}
    />
  );
}
