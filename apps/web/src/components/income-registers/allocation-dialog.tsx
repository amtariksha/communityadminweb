'use client';

import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllocations, type AllocationView } from '@/hooks/use-unit-statement';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';

const REVERSAL_LABELS: Record<string, string> = { void: 'Voided', reallocation: 'Re-allocated' };

export interface DocumentAllocationTarget {
  docType: AllocationView['doc_type'];
  docId: string;
}

/**
 * View Allocation (INC-21/22, INC-36): which bills a payment or credit
 * settled, or what settled a bill. Used by the statement and the registers.
 */
export function DocumentAllocationDialog({
  target,
  number,
  onClose,
}: {
  target: DocumentAllocationTarget | null;
  number: string;
  onClose: () => void;
}): ReactNode {
  const query = useAllocations(target?.docType ?? 'invoice', target?.docId ?? '', target !== null);
  const links = query.data?.links ?? [];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocation of {number}</DialogTitle>
          <DialogDescription>
            {query.data?.advance_remaining !== undefined
              ? `Held as an advance: ${formatCurrency(Number(query.data.advance_remaining))}`
              : 'Payments and credit notes on this bill.'}
          </DialogDescription>
        </DialogHeader>
        {isNotDeployed(query.error) ? (
          <p className="text-sm text-muted-foreground">View Allocation is not available yet on this server.</p>
        ) : (
          <Table aria-label="Allocations">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bill No</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {query.isLoading ? 'Loading…' : 'Nothing allocated.'}
                  </TableCell>
                </TableRow>
              )}
              {links.map((link) => (
                <TableRow key={`${link.kind}:${link.source_id}:${link.invoice_id}:${link.reversed_at ?? ''}`}>
                  <TableCell>{formatDate(link.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{link.invoice_number}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {link.source_number}
                    {link.reversal_reason && (
                      <Badge variant="outline" className="ml-2">
                        {REVERSAL_LABELS[link.reversal_reason] ?? 'Reversed'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={link.reversed_at ? 'text-right line-through' : 'text-right'}>
                    {formatCurrency(Number(link.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
