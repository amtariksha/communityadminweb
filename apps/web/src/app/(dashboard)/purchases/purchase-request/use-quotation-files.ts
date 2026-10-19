'use client';

import { useState } from 'react';
import { useUploadFileToS3 } from '@/hooks/use-documents';
import { useAddPurchaseRequestAttachment } from '@/hooks/use-purchase-requests';

/** Vendor quotations on a request (EXP-S6): up to 5 files, 5 MB each, PDF / JPEG / PNG. */
export const MAX_QUOTATIONS = 5;
export const MAX_QUOTATION_BYTES = 5 * 1024 * 1024;
export const QUOTATION_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

/** Which picked files may be added, and why the others may not. */
export function checkQuotations(alreadyAttached: number, picked: readonly File[]): { accepted: File[]; refused: string[] } {
  const accepted: File[] = [];
  const refused: string[] = [];
  for (const file of picked) {
    if (!(QUOTATION_TYPES as readonly string[]).includes(file.type)) refused.push(`${file.name}: attach a PDF, JPEG or PNG`);
    else if (file.size > MAX_QUOTATION_BYTES) refused.push(`${file.name}: each file must be 5 MB or smaller`);
    else if (alreadyAttached + accepted.length >= MAX_QUOTATIONS) refused.push(`${file.name}: a request holds at most 5 files`);
    else accepted.push(file);
  }
  return { accepted, refused };
}

/**
 * Files picked on the form wait until the request is saved, then go to
 * storage (presigned upload) and are recorded on the request. A file that
 * fails stays on the list so it can be sent again with the next save.
 */
export function useQuotationFiles(alreadyAttached: number) {
  const upload = useUploadFileToS3();
  const attach = useAddPurchaseRequestAttachment();
  const [files, setFiles] = useState<File[]>([]);
  const [refused, setRefused] = useState<string[]>([]);

  function add(picked: readonly File[]): void {
    const check = checkQuotations(alreadyAttached + files.length, picked);
    setRefused(check.refused);
    setFiles((current) => [...current, ...check.accepted]);
  }

  function remove(index: number): void {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  /** Uploads and records every waiting file; returns the names that failed. */
  async function attachAll(requestId: string): Promise<string[]> {
    const failed: File[] = [];
    for (const file of files) {
      try {
        const stored = await upload.mutateAsync({ file });
        await attach.mutateAsync({ id: requestId, file_key: stored.key, file_name: file.name, mime_type: file.type, size_bytes: file.size });
      } catch {
        failed.push(file);
      }
    }
    setFiles(failed);
    return failed.map((file) => file.name);
  }

  return { files, refused, add, remove, attachAll };
}
