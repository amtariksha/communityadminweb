'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useUploadFileToS3 } from '@/hooks/use-documents';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import {
  MAX_VENDOR_FILES,
  VENDOR_FILE_TYPES,
  useAddVendorAttachment,
  useRemoveVendorAttachment,
  useVendorAttachments,
  vendorFileProblem,
  type VendorAttachment,
} from '@/hooks/use-vendor-attachments';
import { ApiError, friendlyError } from '@/lib/api-error';

function FileRow({ file, onRemove, busy }: { file: VendorAttachment; onRemove: () => void; busy: boolean }): ReactNode {
  const openFile = useOpenStoredFile();
  const download = (): Promise<void> => openFile({ key: file.file_key }, { disposition: 'attachment', fileName: file.file_name });
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{file.file_name}</span>
      <span className="text-muted-foreground">{(file.size_bytes / 1024).toFixed(1)} KB</span>
      <Button type="button" size="sm" variant="outline" onClick={() => void download()}>
        Download
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={busy} aria-label={`Remove ${file.file_name}`} onClick={onRemove}>
        Remove
      </Button>
    </li>
  );
}

/**
 * Vendor Attachments (VEND-S2, VEND-08): up to five files on a saved vendor,
 * each uploaded as soon as it is picked. Before the API has the route it
 * says so instead of failing.
 */
export function VendorAttachments({ vendorId }: { vendorId?: string }): ReactNode {
  const { addToast } = useToast();
  const list = useVendorAttachments(vendorId ?? '');
  const upload = useUploadFileToS3();
  const attach = useAddVendorAttachment(vendorId ?? '');
  const remove = useRemoveVendorAttachment(vendorId ?? '');
  const [sending, setSending] = useState(false);
  const files = list.data ?? [];

  async function send(picked: File[]): Promise<void> {
    setSending(true);
    let held = files.length;
    for (const file of picked) {
      const problem = vendorFileProblem(file, held);
      if (problem) {
        addToast({ title: problem, variant: 'destructive' });
        continue;
      }
      try {
        const stored = await upload.mutateAsync({ file });
        await attach.mutateAsync({ file_key: stored.key, file_name: file.name, mime_type: file.type, size_bytes: file.size });
        held += 1;
      } catch (error) {
        addToast({ title: `Could not attach ${file.name}`, description: friendlyError(error), variant: 'destructive' });
      }
    }
    setSending(false);
  }

  if (!vendorId) {
    return <p className="text-sm text-muted-foreground">Files can be attached once the vendor is saved.</p>;
  }
  if (list.error instanceof ApiError && list.error.status === 404) {
    return <p className="text-sm text-muted-foreground">Vendor attachments are not available yet.</p>;
  }
  return (
    <div className="space-y-2">
      <Label htmlFor="vendor-files">Vendor Attachments</Label>
      <ul aria-label="Vendor files" className="space-y-1">
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            busy={remove.isPending}
            onRemove={() =>
              remove.mutate(file.id, {
                onError: (error) => addToast({ title: 'Could not remove the file', description: friendlyError(error), variant: 'destructive' }),
              })
            }
          />
        ))}
      </ul>
      {files.length < MAX_VENDOR_FILES && (
        <input
          id="vendor-files"
          type="file"
          multiple
          disabled={sending}
          accept={VENDOR_FILE_TYPES.join(',')}
          className="block text-sm"
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            event.target.value = '';
            void send(picked);
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Up to {MAX_VENDOR_FILES} files, 5 MB each: PDF, JPEG or PNG. {files.length} of {MAX_VENDOR_FILES} used.
      </p>
    </div>
  );
}
