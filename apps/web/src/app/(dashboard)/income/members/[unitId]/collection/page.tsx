'use client';

import { Suspense, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CollectionFormView } from '@/components/unit-posting/collection-form';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { MEMBER_INCOME_BASE, printReceipt, statementHref } from '../../member-row-actions';

function CollectionRoute(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const bill = useSearchParams().get('bill');
  const router = useRouter();
  const { addToast } = useToast();
  return (
    <CollectionFormView
      unitId={unitId}
      mode="page"
      today={todayIST()}
      preselectBillId={bill}
      onClose={() => router.push(MEMBER_INCOME_BASE)}
      onPosted={(receipt, print) => {
        if (print) {
          printReceipt(receipt.id, receipt.receipt_number).catch((error: unknown) =>
            addToast({ title: 'Could not print the receipt', description: friendlyError(error), variant: 'destructive' }),
          );
        }
        router.push(statementHref(unitId));
      }}
    />
  );
}

// Income Tracker › Member Income › Post Collection for a unit (INC-S21, INC-26).
export default function CollectionPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CollectionRoute />
    </Suspense>
  );
}
