'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useUploadFileToS3 } from '@/hooks/use-documents';
import { api } from '@/lib/api';

/** Attachments on a vendor invoice (EXP-S8): up to 3 files, 5 MB each, PDF / JPEG / PNG. */
export const MAX_INVOICE_FILES = 3;
export const MAX_INVOICE_FILE_BYTES = 5 * 1024 * 1024;
export const INVOICE_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export function checkInvoiceFiles(waiting: number, picked: readonly File[]): { accepted: File[]; refused: string[] } {
  const accepted: File[] = [];
  const refused: string[] = [];
  for (const file of picked) {
    if (!(INVOICE_FILE_TYPES as readonly string[]).includes(file.type)) refused.push(`${file.name}: attach a PDF, JPEG or PNG`);
    else if (file.size > MAX_INVOICE_FILE_BYTES) refused.push(`${file.name}: each file must be 5 MB or smaller`);
    else if (waiting + accepted.length >= MAX_INVOICE_FILES) refused.push(`${file.name}: an invoice holds at most 3 files`);
    else accepted.push(file);
  }
  return { accepted, refused };
}

/** Files wait until the invoice posts, then go to storage and are recorded on it; failures stay listed. */
export function useInvoiceFiles() {
  const upload = useUploadFileToS3();
  // EXP-12: record an uploaded file on the posted invoice.
  const attach = useMutation({
    mutationFn: ({ billId, ...file }: { billId: string; file_key: string; file_name: string; mime_type: string; size_bytes: number }) =>
      api.post(`/purchases/bills/${billId}/attachments`, file),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [refused, setRefused] = useState<string[]>([]);

  function add(picked: readonly File[]): void {
    const check = checkInvoiceFiles(files.length, picked);
    setRefused(check.refused);
    setFiles((current) => [...current, ...check.accepted]);
  }

  function remove(index: number): void {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function attachAll(billId: string): Promise<string[]> {
    const failed: File[] = [];
    for (const file of files) {
      try {
        const stored = await upload.mutateAsync({ file });
        await attach.mutateAsync({ billId, file_key: stored.key, file_name: file.name, mime_type: file.type, size_bytes: file.size });
      } catch {
        failed.push(file);
      }
    }
    setFiles(failed);
    return failed.map((file) => file.name);
  }

  return { files, refused, add, remove, attachAll };
}
