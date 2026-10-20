'use client';

import { Paperclip } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useUploadFileToS3 } from '@/hooks/use-documents';
import { friendlyError } from '@/lib/api-error';
import { isSignableUrl, openStoredFile } from '@/lib/stored-file';

/**
 * Files of Projects & Meetings (project notes, PROJ-40; meeting
 * attachments, PROJ-44): uploaded to our storage first, then named on the
 * record by their URL; opened through a signed link only (the API signs
 * for the record's readers).
 */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface UploadedFile {
  url: string;
  name: string;
  size_bytes?: number;
}

/** A list of stored files; each opens through a signed link. */
export function StoredFileLinks({ files }: { files: ReadonlyArray<{ url: string; name: string }> }): ReactNode {
  const { addToast } = useToast();
  async function open(url: string, name: string): Promise<void> {
    try {
      const opened = await openStoredFile(url, { disposition: 'inline', fileName: name });
      if (!opened) addToast({ title: 'This file is not available to you.', variant: 'destructive' });
    } catch (error) {
      addToast({ title: 'Could not open the file', description: friendlyError(error), variant: 'destructive' });
    }
  }
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {files.filter((file) => isSignableUrl(file.url)).map((file) => (
        <li key={file.url}>
          <Button type="button" variant="outline" size="sm" onClick={() => void open(file.url, file.name)}>
            <Paperclip className="mr-1 h-3 w-3" />
            {file.name}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** "Attach a document or image": uploads each chosen file (≤ 10 MB, `room` more at most). */
export function FileAttachButton(props: { room: number; disabled?: boolean; onUploaded: (files: UploadedFile[]) => void; label?: string }): ReactNode {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadFileToS3();
  const { addToast } = useToast();

  async function chosen(list: FileList | null): Promise<void> {
    const files = [...(list ?? [])];
    if (input.current) input.current.value = '';
    if (files.length === 0) return;
    if (files.length > props.room) return addToast({ title: `You can attach ${props.room} more file(s).`, variant: 'destructive' });
    if (files.some((file) => file.size > MAX_FILE_BYTES)) return addToast({ title: 'Each file is at most 10 MB.', variant: 'destructive' });
    try {
      const uploaded = await Promise.all(files.map((file) => upload.mutateAsync({ file })));
      props.onUploaded(uploaded.map((result, index) => ({ url: result.fileUrl, name: files[index].name, size_bytes: files[index].size })));
    } catch (error) {
      addToast({ title: 'Could not upload the file', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <>
      <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf,.xls,.xlsx,.csv,.txt" onChange={(e) => void chosen(e.target.files)} />
      <Button type="button" variant="outline" size="sm" disabled={props.disabled || props.room <= 0 || upload.isPending} onClick={() => input.current?.click()}>
        <Paperclip className="mr-1 h-3 w-3" />
        {upload.isPending ? 'Uploading…' : (props.label ?? 'Attach a document or image')}
      </Button>
    </>
  );
}
