'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PayerCollectionFormView } from '@/components/unit-posting/payer-collection-form';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { printReceipt } from '../../../../members/member-row-actions';
import { NON_MEMBER_BASE, payerStatementHref } from '../../../non-member-routes';

// Income Tracker › Non Member Income › Post Collection for a payer (INC-S30, INC-45).
export default function PayerCollectionPage(): ReactNode {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  return (
    <PayerCollectionFormView
      customerId={customerId}
      mode="page"
      today={todayIST()}
      onClose={() => router.push(NON_MEMBER_BASE)}
      onPosted={(receipt, print) => {
        if (print) {
          printReceipt(receipt.id, receipt.receipt_number).catch((error: unknown) =>
            addToast({ title: 'Could not print the receipt', description: friendlyError(error), variant: 'destructive' }),
          );
        }
        router.push(payerStatementHref(customerId));
      }}
    />
  );
}
