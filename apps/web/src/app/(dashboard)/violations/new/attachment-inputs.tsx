'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const ALLOWED = /\.(jpe?g|png|webp|pdf)$/i;

/** Why these files cannot be attached, or null (≤ 5 files, ≤ 8 MB each, JPEG / PNG / WebP / PDF). */
export function attachmentError(files: readonly File[]): string | null {
  if (files.length > MAX_FILES) return 'Attach at most 5 files.';
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return 'Each file is at most 8 MB.';
  if (files.some((file) => !ALLOWED.test(file.name))) return 'Attach JPEG, PNG, WebP or PDF files.';
  return null;
}

interface AttachmentInputsProps {
  /** Classic: five single inputs; standard: one multi-picker (RULE-S7). */
  slots: boolean;
  files: readonly (File | null)[];
  onChange: (files: (File | null)[]) => void;
}

export function AttachmentInputs({ slots, files, onChange }: AttachmentInputsProps): ReactNode {
  if (!slots) {
    return (
      <div className="space-y-1">
        <Label htmlFor="violation-files">Attachments</Label>
        <Input
          id="violation-files"
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(event) => onChange(Array.from(event.target.files ?? []))}
        />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Attachments</span>
      {Array.from({ length: MAX_FILES }, (_, index) => (
        <Input
          key={index}
          type="file"
          aria-label={`Attachment ${index + 1}`}
          accept={ACCEPT}
          onChange={(event) => {
            const next = Array.from({ length: MAX_FILES }, (_, i) => files[i] ?? null);
            next[index] = event.target.files?.[0] ?? null;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}
