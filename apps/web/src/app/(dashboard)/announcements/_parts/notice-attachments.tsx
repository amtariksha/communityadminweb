'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { UploadProgress } from '@/components/ui/upload-progress';
import { MAX_NOTICE_FILES, NOTICE_FILE_ACCEPT, type NoticeFiles } from './use-notice-files';

/** ANN-11 — Attachments: up to five files, each with its progress, Retry and Remove. */
export function NoticeAttachments({ files }: { files: NoticeFiles }): ReactNode {
  const full = files.files.length >= MAX_NOTICE_FILES;
  return (
    <div className="space-y-2">
      <label htmlFor="notice-files" className="text-sm font-medium">
        Attachments
      </label>
      <input
        id="notice-files"
        type="file"
        multiple
        accept={NOTICE_FILE_ACCEPT}
        disabled={full}
        className="block text-sm"
        onChange={(event) => {
          files.add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <p className="text-xs text-muted-foreground">Up to {MAX_NOTICE_FILES} files: JPEG, PNG, WebP or PDF, 8 MB each.</p>
      {files.refused.map((reason) => (
        <p key={reason} className="text-xs text-destructive">{reason}</p>
      ))}
      <ul className="space-y-1">
        {files.files.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 text-sm">
            <span className={entry.state === 'error' ? 'text-destructive' : undefined}>{entry.name}</span>
            {entry.state === 'uploading' && <UploadProgress percent={entry.percent} className="w-32" />}
            {entry.state === 'error' && (
              <Button type="button" size="sm" variant="outline" onClick={() => void files.retry(entry)}>
                Retry
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => files.remove(entry.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
