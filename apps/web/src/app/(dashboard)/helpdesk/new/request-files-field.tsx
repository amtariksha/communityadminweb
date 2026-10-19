'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadProgress } from '@/components/ui/upload-progress';
import { ACCEPT_ATTRIBUTE } from './request-fields';
import type { AttachedFile, useRequestFiles } from './use-request-files';

function FileRow({ entry, onRemove, onRetry }: { entry: AttachedFile; onRemove: () => void; onRetry: () => void }): ReactNode {
  const failed = entry.state === 'error';
  return (
    <li className={failed ? 'rounded border border-destructive p-2 text-sm' : 'rounded border p-2 text-sm'}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">
          {entry.file.name} — {(entry.file.size / 1024).toFixed(1)} KB
        </span>
        <span className="flex items-center gap-1">
          {failed && (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${entry.file.name}`} onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        </span>
      </div>
      {failed && <p className="text-xs text-destructive">Could not upload this file. Retry or remove it.</p>}
      <UploadProgress percent={entry.percent} fileName={entry.file.name} state={failed ? 'error' : entry.state === 'done' ? 'done' : 'uploading'} />
    </li>
  );
}

/** Up to five files, each with its upload progress, Retry and Remove. */
export function FilesField({ files }: { files: ReturnType<typeof useRequestFiles> }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="request-files">Drag &amp; Drop your files or Browse (up to 5, 8 MB each)</Label>
      <Input
        id="request-files"
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          files.add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      {files.refused.length > 0 && (
        <div role="alert" className="text-sm text-destructive">
          {files.refused.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}
      {files.files.length > 0 && (
        <ul className="space-y-1">
          {files.files.map((entry) => (
            <FileRow key={entry.id} entry={entry} onRemove={() => files.remove(entry.id)} onRetry={() => void files.retry(entry)} />
          ))}
        </ul>
      )}
    </div>
  );
}
