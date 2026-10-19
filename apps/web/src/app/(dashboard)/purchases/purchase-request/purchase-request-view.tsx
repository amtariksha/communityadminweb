'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { FormMode } from '@/components/form-page';
import { useWithdrawPurchaseRequest, type PRDetail } from '@/hooks/use-purchase-requests';
import { friendlyError } from '@/lib/api-error';
import { getUser } from '@/lib/auth';
import { GST_TYPE_LABELS, rupees } from '@/lib/gst-lines';
import { formatDate } from '@/lib/utils';
import { ApprovalTrail } from './approval-blocks';
import { htmlToText } from './request-state';
import { prStatusLabel } from './status-labels';

const paise = (value: string) => Math.round(Number(value) * 100);

function LinesTable({ detail }: { detail: PRDetail }): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Lines">
        <thead>
          <tr className="text-left text-muted-foreground">
            {['Sl.No', 'Expense Head', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Amount', 'GST', 'CGST', 'SGST', 'IGST', 'Line Total'].map((h) => (
              <th key={h} className="whitespace-nowrap py-1 pr-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line) => (
            <tr key={line.line_no} className="border-t">
              <td className="py-1">{line.line_no}</td>
              <td>{line.ledger_account_name ? `${line.ledger_account_code ?? ''} ${line.ledger_account_name}`.trim() : '—'}</td>
              <td>{line.description ?? '—'}</td>
              <td>{line.hsn_sac ?? '—'}</td>
              <td className="tabular-nums">{Number(line.quantity)}</td>
              <td className="tabular-nums">{rupees(paise(line.unit_rate))}</td>
              <td className="tabular-nums">{rupees(paise(line.taxable_amount))}</td>
              <td>{line.gst_type === 'none' ? GST_TYPE_LABELS.none : `${GST_TYPE_LABELS[line.gst_type]} ${Number(line.gst_rate)}%`}</td>
              <td className="tabular-nums">{rupees(paise(line.cgst_amount))}</td>
              <td className="tabular-nums">{rupees(paise(line.sgst_amount))}</td>
              <td className="tabular-nums">{rupees(paise(line.igst_amount))}</td>
              <td className="tabular-nums font-medium">{rupees(paise(line.line_total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {detail.legacy && <p className="mt-1 text-xs text-muted-foreground">Raised before requests had lines: shown as one line of its amount.</p>}
    </div>
  );
}

function Body({ detail, onClose }: { detail: PRDetail; onClose: () => void }): ReactNode {
  const pr = detail.purchase_request;
  const withdraw = useWithdrawPurchaseRequest();
  const { addToast } = useToast();
  const mine = pr.requested_by === getUser()?.id;
  const onWithdraw = () =>
    withdraw.mutate(pr.id, {
      onSuccess: () => addToast({ title: 'Request withdrawn', variant: 'success' }),
      onError: (failure) => addToast({ title: 'Could not withdraw', description: friendlyError(failure), variant: 'destructive' }),
    });
  return (
    <div className="space-y-4">
      <dl className="grid gap-2 text-sm md:grid-cols-3">
        <div><dt className="text-muted-foreground">PR No.</dt><dd>{pr.pr_number}</dd></div>
        <div><dt className="text-muted-foreground">Status</dt><dd>{prStatusLabel(pr.status)}</dd></div>
        <div><dt className="text-muted-foreground">Date</dt><dd>{formatDate(pr.request_date)}</dd></div>
        <div><dt className="text-muted-foreground">Raised by</dt><dd>{pr.requested_by_name ?? '—'}</dd></div>
        <div><dt className="text-muted-foreground">Vendor</dt><dd>{pr.vendor_name ?? '—'}</dd></div>
        <div><dt className="text-muted-foreground">Grand total</dt><dd className="font-semibold">{rupees(paise(detail.totals.grand_total))}</dd></div>
      </dl>
      {pr.details_html && <p className="whitespace-pre-wrap text-sm">{htmlToText(pr.details_html)}</p>}
      <LinesTable detail={detail} />
      {detail.attachments.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {detail.attachments.map((file) => (
            <li key={file.id}>{file.file_name}</li>
          ))}
        </ul>
      )}
      {detail.approval && <ApprovalTrail steps={detail.approval.steps} />}
      <div className="flex gap-2 border-t pt-3">
        {mine && pr.status === 'pending_approval' && (
          <Button type="button" variant="outline" disabled={withdraw.isPending} onClick={onWithdraw}>
            Withdraw
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/** A sent or someone else's request, read-only with its approval trail (EXP-S6 view). */
export function PurchaseRequestView(props: { mode: FormMode; open?: boolean; detail: PRDetail; onClose: () => void }): ReactNode {
  const title = `Purchase request ${props.detail.purchase_request.pr_number}: ${props.detail.purchase_request.title}`;
  if (props.mode === 'dialog') {
    return (
      <Dialog open={props.open ?? false} onOpenChange={(open) => !open && props.onClose()}>
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Body detail={props.detail} onClose={props.onClose} />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Body detail={props.detail} onClose={props.onClose} />
      </CardContent>
    </Card>
  );
}
