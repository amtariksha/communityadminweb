'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFormMode } from '@/components/form-page';
import { PageHeader } from '@/components/layout/page-header';
import { MemberIncomeTable } from '@/components/member-income/member-income-table';
import { CollectionFormView } from '@/components/unit-posting/collection-form';
import { PostInvoiceForm } from '@/components/unit-posting/post-invoice-form';
import { useToast } from '@/components/ui/toast';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import type { UnitDuesRow } from '@/hooks/use-unit-ledger';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { saveBlob } from '@/lib/download';
import { useAdminLayout } from '@/lib/layout-context';
import { isNotDeployed } from '@/lib/not-deployed';
import { collectionHref, invoiceHref, invoiceMoreActions, memberRowActions, printReceipt } from './member-row-actions';

/**
 * The treasurer's daily screen: every unit with what it owes and the
 * buttons to act on it. The classic module frame draws the title there.
 * Post Invoice opens as a page in classic and as a dialog in standard (SB-07).
 */
export function MemberIncomeContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const mode = useFormMode();
  const router = useRouter();
  const access = useFinanceAccess();
  const { addToast } = useToast();
  const [invoiceFor, setInvoiceFor] = useState<UnitDuesRow | null>(null);
  const [collectFor, setCollectFor] = useState<{ unitId: string; billId: string | null } | null>(null);

  async function print(row: UnitDuesRow): Promise<void> {
    try {
      const blob = await api.download(`/unit-ledger/units/${row.unit_id}/statement`, { params: { format: 'pdf' } });
      saveBlob(blob, `statement-${row.unit_number}.pdf`);
    } catch (error) {
      const description = isNotDeployed(error) ? 'The statement PDF is not available yet on this server.' : friendlyError(error);
      addToast({ title: 'Could not print the statement', description, variant: 'destructive' });
    }
  }

  function invoice(row: UnitDuesRow): void {
    if (mode === 'page') router.push(invoiceHref(row.unit_id));
    else setInvoiceFor(row);
  }

  function collection(row: UnitDuesRow): void {
    if (mode === 'page') router.push(collectionHref(row.unit_id));
    else setCollectFor({ unitId: row.unit_id, billId: null });
  }

  return (
    <div className="space-y-6">
      {!classic && (
        <PageHeader title="Member Dues" description="What each unit owes, and its account and postings from its row." />
      )}
      <MemberIncomeTable
        scope="member"
        title="Member Dues"
        rowActions={memberRowActions(access, { print: (row) => void print(row), invoice, collection })}
        exportFilename="member-dues"
      />
      {invoiceFor && (
        <PostInvoiceForm
          key={invoiceFor.unit_id}
          unitId={invoiceFor.unit_id}
          mode="dialog"
          open
          today={todayIST()}
          moreActions={invoiceMoreActions(invoiceFor.unit_id)}
          onClose={() => setInvoiceFor(null)}
          onPosted={() => setInvoiceFor(null)}
          onPostedAndCollect={(posted) => {
            setInvoiceFor(null);
            setCollectFor({ unitId: posted.unit_id, billId: posted.id });
          }}
        />
      )}
      {collectFor && (
        <CollectionFormView
          key={`${collectFor.unitId}:${collectFor.billId ?? ''}`}
          unitId={collectFor.unitId}
          mode="dialog"
          open
          today={todayIST()}
          preselectBillId={collectFor.billId}
          onClose={() => setCollectFor(null)}
          onPosted={(receipt, printIt) => {
            setCollectFor(null);
            if (printIt) void printReceipt(receipt.id, receipt.receipt_number).catch((error: unknown) => addToast({ title: 'Could not print the receipt', description: friendlyError(error), variant: 'destructive' }));
          }}
        />
      )}
    </div>
  );
}
