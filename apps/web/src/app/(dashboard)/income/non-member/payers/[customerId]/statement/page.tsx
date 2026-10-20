'use client';

import { Suspense, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { PayerStatementContent } from '../../../payer-statement-content';

// Income Tracker › Non Member Income › a payer's Account Statement (INC-S30 View, INC-46).
export default function PayerStatementPage(): ReactNode {
  const { customerId } = useParams<{ customerId: string }>();
  return (
    <Suspense fallback={null}>
      <PayerStatementContent customerId={customerId} />
    </Suspense>
  );
}
