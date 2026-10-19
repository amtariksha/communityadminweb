'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { INVOICE_FILE_TYPES } from './use-invoice-files';

/** The Attachments field of Post vendor invoice: files waiting to be sent with the invoice. */
export function InvoiceFiles(props: { waiting: readonly File[]; refused: readonly string[]; onAdd: (files: File[]) => void; onRemove: (index: number) => void }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor="inv-files">Attachments</Label>
      <input
        id="inv-files"
        type="file"
        multiple
        accept={INVOICE_FILE_TYPES.join(',')}
        className="block text-sm"
        onChange={(event) => {
          props.onAdd(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <p className="text-xs text-muted-foreground">Up to 3 files, 5 MB each: PDF, JPEG or PNG. They are sent when the invoice is posted.</p>
      <ul className="space-y-1 text-sm">
        {props.waiting.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center gap-2">
            <span>{file.name} — {(file.size / 1024).toFixed(1)} KB</span>
            <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => props.onRemove(index)}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      {props.refused.map((message) => (
        <p key={message} className="text-xs text-destructive">{message}</p>
      ))}
    </div>
  );
}
