'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * QA #261 — minimal progress bar shown during direct-to-object-store
 * uploads (`useUploadFileToS3` with the `onProgress` callback). Pass
 * `percent` (0..100), and optionally `fileName` + `state`. Render as a
 * sibling of whatever button kicked off the upload.
 *
 * Returns null when `percent` is null/undefined so the caller doesn't
 * need to conditional-render around it.
 */
interface UploadProgressProps {
  percent: number | null | undefined;
  fileName?: string;
  /** When 'error', flips the bar to the destructive colour. */
  state?: 'uploading' | 'done' | 'error';
  className?: string;
}

export function UploadProgress({
  percent,
  fileName,
  state = 'uploading',
  className,
}: UploadProgressProps): ReactNode {
  if (percent == null) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const trackColor =
    state === 'error'
      ? 'bg-destructive'
      : state === 'done'
        ? 'bg-success'
        : 'bg-primary';

  const label =
    state === 'error'
      ? 'Upload failed'
      : state === 'done'
        ? 'Uploaded'
        : `Uploading… ${clamped}%`;

  return (
    <div className={cn('mt-2 space-y-1 text-xs', className)}>
      <div className="flex items-center justify-between gap-2">
        {fileName ? (
          <span className="truncate text-muted-foreground">{fileName}</span>
        ) : (
          <span className="text-muted-foreground">{label.split('…')[0]}</span>
        )}
        <span className="font-mono tabular-nums text-muted-foreground">
          {state === 'uploading' ? `${clamped}%` : label}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-[width] duration-150', trackColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
