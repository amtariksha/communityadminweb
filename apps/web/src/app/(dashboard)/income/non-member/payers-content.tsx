'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useFormMode } from '@/components/form-page';
import { PageHeader } from '@/components/layout/page-header';
import { PayerCollectionFormView } from '@/components/unit-posting/payer-collection-form';
import { buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { useAdminLayout } from '@/lib/layout-context';
import { formatCurrency } from '@/lib/utils';
import { CustomInvoiceDialog } from '../../invoices/custom-invoice-dialog';
import type { Party } from '../../vendor-master/party-form';
import { printReceipt } from '../members/member-row-actions';
import { NEW_PAYER_HREF, NON_MEMBER_BY_DATE, payerCollectionHref } from './non-member-routes';
import { payerRowActions } from './payer-row-actions';
import { PayersTable } from './payers-table';

function Heading({ total, totalDue, active, canWrite }: { total: number; totalDue: number | undefined; active: boolean; canWrite: boolean }): ReactNode {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-semibold">
        {active ? 'Active Payers' : 'In-Active Payers'} ({total})
        {totalDue !== undefined && <span className="ml-4 text-sm font-medium">Total Due {formatCurrency(totalDue)}</span>}
      </h3>
      {canWrite && (
        <Link href={NEW_PAYER_HREF} className={buttonVariants()} data-slot="button" data-size="default">
          Add Payer
        </Link>
      )}
    </div>
  );
}

/**
 * Income Tracker › Non Member Income › By Vendors (INC-S30, INC-46): the
 * payers with what each owes and a Total Due line; View opens the payer's
 * statement, Invoice a non-member invoice from the payer's defaults,
 * Collection its open invoices (INC-45).
 */
export function PayersContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const mode = useFormMode();
  const router = useRouter();
  const access = useFinanceAccess();
  const { addToast } = useToast();
  const [invoiceFor, setInvoiceFor] = useState<Party | null>(null);
  const [collectFor, setCollectFor] = useState<string | null>(null);
  const actions = payerRowActions(access, {
    invoice: (row) => setInvoiceFor(row),
    collection: (row) => (mode === 'page' ? router.push(payerCollectionHref(row.id)) : setCollectFor(row.id)),
  });

  return (
    <div className="space-y-4">
      {!classic && (
        <PageHeader
          title="Non Member Income"
          description={<Link href={NON_MEMBER_BY_DATE} className="text-primary hover:underline">By Date</Link>}
        />
      )}
      <PayersTable actions={actions} heading={(summary) => <Heading {...summary} canWrite={access.canWrite} />} />
      <CustomInvoiceDialog open={invoiceFor !== null} onOpenChange={(open) => !open && setInvoiceFor(null)} initialCustomer={invoiceFor ?? undefined} />
      {collectFor && (
        <PayerCollectionFormView
          key={collectFor}
          customerId={collectFor}
          mode="dialog"
          open
          today={todayIST()}
          onClose={() => setCollectFor(null)}
          onPosted={(receipt, print) => {
            setCollectFor(null);
            if (print) void printReceipt(receipt.id, receipt.receipt_number).catch((error: unknown) => addToast({ title: 'Could not print the receipt', description: friendlyError(error), variant: 'destructive' }));
          }}
        />
      )}
    </div>
  );
}
