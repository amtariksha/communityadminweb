'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type TicketComment } from '@/hooks';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import { IMAGE_TYPES } from '../helpdesk/new/request-fields';
import type { useRequestFiles } from '../helpdesk/new/use-request-files';

/** The images a comment carries, each opening in a new tab (HELP-19). */
export function CommentAttachments({ comment }: { comment: TicketComment }): ReactNode {
  const open = useOpenStoredFile();
  const urls = comment.attachment_urls ?? [];
  if (urls.length === 0) return null;

  return (
    <ul className="mt-1 flex flex-wrap gap-2 text-xs">
      {urls.map((url, index) => {
        const name = comment.attachment_names?.[index] ?? `File ${index + 1}`;
        return (
          <li key={url}>
            <button type="button" className="text-primary hover:underline" onClick={() => void open(url, { fileName: name })}>
              {name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Up to five images picked for the next comment of one thread. */
export function CommentFilePicker({ id, files }: { id: string; files: ReturnType<typeof useRequestFiles> }): ReactNode {
  return (
    <div className="space-y-1">
      <input
        id={id}
        type="file"
        multiple
        aria-label="Add images"
        accept={IMAGE_TYPES.join(',')}
        className="text-xs"
        onChange={(event) => {
          files.add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      {files.refused.length > 0 && (
        <div role="alert" className="text-xs text-destructive">
          {files.refused.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}
      {files.files.length > 0 && (
        <ul className="space-y-1 text-xs">
          {files.files.map((entry) => (
            <li key={entry.id} className={entry.state === 'error' ? 'flex items-center gap-1 text-destructive' : 'flex items-center gap-1'}>
              <span className="truncate">{entry.file.name}</span>
              {entry.state === 'error' && <span>(could not upload)</span>}
              <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${entry.file.name}`} onClick={() => files.remove(entry.id)}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
