'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QUOTATION_TYPES } from './use-quotation-files';

/** The "Vendor quotations" field: files already on the request, files waiting to be sent, and a picker. */
export function QuotationFiles(props: {
  attached: ReadonlyArray<{ id: string; file_name: string }>;
  waiting: readonly File[];
  refused: readonly string[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** Takes an attached file off the saved request; absent where files cannot be removed. */
  onRemoveAttached?: (attachmentId: string) => void;
  removingId?: string | null;
}): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor="pr-quotations">Vendor quotations</Label>
      <input
        id="pr-quotations"
        type="file"
        multiple
        accept={QUOTATION_TYPES.join(',')}
        className="block text-sm"
        onChange={(event) => {
          props.onAdd(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <p className="text-xs text-muted-foreground">Up to 5 files, 5 MB each: PDF, JPEG or PNG. They are sent when the request is saved.</p>
      <ul className="space-y-1 text-sm">
        {props.attached.map((file) => (
          <li key={file.id} className="flex items-center gap-2">
            <span>{file.file_name}</span>
            {props.onRemoveAttached && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove ${file.file_name}`}
                disabled={props.removingId === file.id}
                onClick={() => props.onRemoveAttached?.(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {props.waiting.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center gap-2">
            <span>{file.name} — {(file.size / 1024).toFixed(1)} KB (to send)</span>
            <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => props.onRemove(index)}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      {props.refused.map((message) => (
        <p key={message} className="text-xs text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}
