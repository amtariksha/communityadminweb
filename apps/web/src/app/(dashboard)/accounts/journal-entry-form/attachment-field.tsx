'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// GL-20: a supporting document — PDF or image, at most 10 MB.
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Why a picked file cannot be attached; null when it can. */
export function attachmentProblem(file: File | null): string | null {
  if (!file) return null;
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return 'Attach a PDF, JPEG or PNG file.';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'The attachment must be 10 MB or smaller.';
  return null;
}

export function AttachmentField({ id, file, onChange }: { id: string; file: File | null; onChange: (file: File | null) => void }): ReactNode {
  const problem = attachmentProblem(file);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Attachment</Label>
      <Input id={id} type="file" accept={ATTACHMENT_TYPES.join(',')} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {problem && <p role="alert" className="text-xs text-destructive">{problem}</p>}
    </div>
  );
}
