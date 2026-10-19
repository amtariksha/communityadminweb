'use client';

import type { Vendor } from '@communityos/shared';
import { useToast } from '@/components/ui/toast';
import { useOcrInvoice } from '@/hooks/use-ocr';
import { friendlyError } from '@/lib/api-error';
import type { InvoiceHeader, InvoiceRow } from './invoice-model';
import { scanToInvoice } from './invoice-scan';

const MAX_SCAN_BYTES = 10 * 1024 * 1024;

/** "Scan invoice with AI" (existing OCR): fills the header and line 1; the operator checks every field. */
export function useInvoiceScan(
  vendors: readonly Vendor[],
  fixedVendorId: string | undefined,
  setHeader: (fn: (h: InvoiceHeader) => InvoiceHeader) => void,
  setRows: (fn: (rows: InvoiceRow[]) => InvoiceRow[]) => void,
): { read: (file: File | undefined) => Promise<void>; pending: boolean } {
  const { addToast } = useToast();
  const ocr = useOcrInvoice();

  async function read(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > MAX_SCAN_BYTES) {
      addToast({ title: 'File too large', description: 'Max 10 MiB for AI scanning.', variant: 'destructive' });
      return;
    }
    try {
      const found = scanToInvoice(await ocr.mutateAsync(file), vendors, fixedVendorId);
      setHeader((h) => ({ ...h, ...found.header, vendorId: found.vendorId ?? h.vendorId }));
      setRows((current) => {
        const first = { ...current[0], ...found.row };
        if (found.gstRate !== null) {
          if (first.igstRate) first.igstRate = String(found.gstRate);
          else first.cgstSgstRate = String(found.gstRate);
        }
        return [first, ...current.slice(1)];
      });
      addToast({ title: 'Invoice read — check every field', description: `Confidence ${Math.round(found.confidence * 100)}%.` });
    } catch (err) {
      addToast({ title: 'AI extraction failed', description: friendlyError(err), variant: 'destructive' });
    }
  }

  return { read, pending: ocr.isPending };
}
