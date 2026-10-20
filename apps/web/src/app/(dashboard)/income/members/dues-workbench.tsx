'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFormMode } from '@/components/form-page';
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
import { isNotDeployed } from '@/lib/not-deployed';
import { collectionHref, depositHref, invoiceHref, memberRowActions, printReceipt } from './member-row-actions';

export interface DuesWorkbenchProps {
  /** Member Income: maintenance dues; Utility Income: utility dues (UTIL-08). */
  scope: 'member' | 'utility';
  /** The route the row screens live under, e.g. /income/members. */
  base: string;
  title: string;
  exportFilename: string;
  trackedOnly?: boolean;
  /** Classic arrangement (INC-35): no rows until a block or a search is chosen. */
  opensEmpty?: boolean;
  /** Other postings offered under Post Invoice. */
  moreActions?: (unitId: string) => Array<{ label: string; href: string }>;
}

/**
 * The unit dues workbench (INC-S16) with its four row buttons: View, and
 * Print for every finance reader; Post Invoice and Post Collection for the
 * writers, as pages in classic and as dialogs in standard (SB-07). Member
 * Income and Utility Income are this screen on their own ledger.
 */
export function DuesWorkbench(props: DuesWorkbenchProps): ReactNode {
  const { scope, base, title, exportFilename, trackedOnly, opensEmpty, moreActions } = props;
  const mode = useFormMode();
  const router = useRouter();
  const access = useFinanceAccess();
  const { addToast } = useToast();
  const [invoiceFor, setInvoiceFor] = useState<UnitDuesRow | null>(null);
  const [collectFor, setCollectFor] = useState<{ unitId: string; billId: string | null } | null>(null);

  async function print(row: UnitDuesRow): Promise<void> {
    try {
      const blob = await api.download(`/unit-ledger/units/${row.unit_id}/statement`, { params: { format: 'pdf', scope } });
      saveBlob(blob, `statement-${row.unit_number}.pdf`);
    } catch (error) {
      const description = isNotDeployed(error) ? 'The statement PDF is not available yet on this server.' : friendlyError(error);
      addToast({ title: 'Could not print the statement', description, variant: 'destructive' });
    }
  }

  const handlers = {
    print: (row: UnitDuesRow) => void print(row),
    invoice: (row: UnitDuesRow) => (mode === 'page' ? router.push(invoiceHref(row.unit_id, base)) : setInvoiceFor(row)),
    collection: (row: UnitDuesRow) =>
      mode === 'page' ? router.push(collectionHref(row.unit_id, undefined, base)) : setCollectFor({ unitId: row.unit_id, billId: null }),
  };

  return (
    <>
      <MemberIncomeTable
        scope={scope}
        title={title}
        rowActions={memberRowActions(access, handlers, base)}
        exportFilename={exportFilename}
        trackedOnly={trackedOnly}
        opensEmpty={opensEmpty}
      />
      {invoiceFor && (
        <PostInvoiceForm
          key={invoiceFor.unit_id}
          unitId={invoiceFor.unit_id}
          scope={scope}
          mode="dialog"
          open
          today={todayIST()}
          moreActions={moreActions?.(invoiceFor.unit_id)}
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
          scope={scope}
          mode="dialog"
          open
          today={todayIST()}
          preselectBillId={collectFor.billId}
          depositHref={scope === 'member' ? depositHref(collectFor.unitId) : undefined}
          onClose={() => setCollectFor(null)}
          onPosted={(receipt, printIt) => {
            setCollectFor(null);
            if (printIt) void printReceipt(receipt.id, receipt.receipt_number).catch((error: unknown) => addToast({ title: 'Could not print the receipt', description: friendlyError(error), variant: 'destructive' }));
          }}
        />
      )}
    </>
  );
}
