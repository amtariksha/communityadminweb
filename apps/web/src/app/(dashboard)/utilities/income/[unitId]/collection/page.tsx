'use client';

import { Suspense, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CollectionFormView } from '@/components/unit-posting/collection-form';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { printReceipt, statementHref, UTILITY_INCOME_BASE } from '@/app/(dashboard)/income/members/member-row-actions';

function UtilityCollectionRoute(): ReactNode {
  const { unitId } = useParams<{ unitId: string }>();
  const bill = useSearchParams().get('bill');
  const router = useRouter();
  const { addToast } = useToast();
  return (
    <CollectionFormView
      unitId={unitId}
      scope="utility"
      mode="page"
      today={todayIST()}
      preselectBillId={bill}
      onClose={() => router.push(UTILITY_INCOME_BASE)}
      onPosted={(receipt, print) => {
        if (print) {
          printReceipt(receipt.id, receipt.receipt_number).catch((error: unknown) =>
            addToast({ title: 'Could not print the receipt', description: friendlyError(error), variant: 'destructive' }),
          );
        }
        router.push(statementHref(unitId, UTILITY_INCOME_BASE));
      }}
    />
  );
}

// Utility Tracker › Utility Income › Post Collection for a unit (UTIL-S6, UTIL-08): its utility bills only.
export default function UtilityCollectionPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <UtilityCollectionRoute />
    </Suspense>
  );
}
