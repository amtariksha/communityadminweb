'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAddAmcAttachment, useAmcAttachments, useRemoveAmcAttachment } from '@/hooks/use-amc-contracts';
import { useUploadFileToS3 } from '@/hooks/use-documents';
import { MAX_VENDOR_FILE_BYTES, VENDOR_FILE_TYPES } from '@/hooks/use-vendor-attachments';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

/** VEND-S8 "Select files": up to five files, 5 MB each, uploaded on Save. */
export const MAX_AMC_FILES = 5;

export interface QueuedFile {
  file: File;
  status: 'waiting' | 'uploading' | 'done' | 'failed';
  error?: string;
}

const STATUS_WORDS: Readonly<Record<QueuedFile['status'], string>> = { waiting: 'Waiting', uploading: 'Uploading…', done: 'Uploaded', failed: 'Failed' };

/** The picked file may be queued, or why not. */
export function amcFileProblem(file: Pick<File, 'name' | 'type' | 'size'>, held: number): string | null {
  if (!(VENDOR_FILE_TYPES as readonly string[]).includes(file.type)) return `${file.name}: attach a PDF, JPEG or PNG`;
  if (file.size > MAX_VENDOR_FILE_BYTES) return `${file.name}: each file must be 5 MB or smaller`;
  if (held >= MAX_AMC_FILES) return 'A contract can hold five files';
  return null;
}

/** The queue and its upload once the contract is saved. */
export function useAmcFileQueue() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const upload = useUploadFileToS3();
  const attach = useAddAmcAttachment();
  const mark = (index: number, patch: Partial<QueuedFile>): void => setQueue((current) => current.map((item, at) => (at === index ? { ...item, ...patch } : item)));

  async function uploadAll(contractId: string): Promise<number> {
    let failed = 0;
    for (const [index, item] of queue.entries()) {
      if (item.status === 'done') continue;
      mark(index, { status: 'uploading' });
      try {
        const stored = await upload.mutateAsync({ file: item.file });
        await attach.mutateAsync({ id: contractId, file_key: stored.key, file_name: item.file.name, mime_type: item.file.type, size_bytes: item.file.size });
        mark(index, { status: 'done' });
      } catch (error) {
        failed += 1;
        mark(index, { status: 'failed', error: isNotDeployed(error) ? 'Contract files are not available yet.' : friendlyError(error) });
      }
    }
    return failed;
  }

  return {
    queue,
    add: (files: File[]) => setQueue((current) => [...current, ...files.map((file) => ({ file, status: 'waiting' as const }))]),
    remove: (index: number) => setQueue((current) => current.filter((_, at) => at !== index)),
    uploadAll,
  };
}

type FileQueue = ReturnType<typeof useAmcFileQueue>;

function Stored({ contractId }: { contractId: string }): ReactNode {
  const files = useAmcAttachments(contractId);
  const remove = useRemoveAmcAttachment();
  if (!files.data || files.data.length === 0) return null;
  return (
    <ul aria-label="Contract files" className="space-y-1 text-sm">
      {files.data.map((file) => (
        <li key={file.id} className="flex items-center gap-2">
          <span className="font-medium">{file.file_name}</span>
          <span className="text-muted-foreground">{(file.size_bytes / 1024).toFixed(1)} KB</span>
          <Button type="button" size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate({ id: contractId, attachmentId: file.id })}>
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Select files (VEND-S8): the queue shows Filename · Status · Size; files are uploaded on Save. */
export function AmcFiles({ queue, contractId, onProblem }: { queue: FileQueue; contractId?: string; onProblem: (message: string) => void }): ReactNode {
  const stored = useAmcAttachments(contractId ?? '').data?.length ?? 0;
  function pick(files: File[]): void {
    let held = stored + queue.queue.length;
    const accepted: File[] = [];
    for (const file of files) {
      const problem = amcFileProblem(file, held);
      if (problem) onProblem(problem);
      else {
        accepted.push(file);
        held += 1;
      }
    }
    queue.add(accepted);
  }
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">Select files</legend>
      {contractId && <Stored contractId={contractId} />}
      {queue.queue.length > 0 && (
        <table aria-label="Files to upload" className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Filename</th><th>Status</th><th>Size</th><th /></tr></thead>
          <tbody>
            {queue.queue.map((item, index) => (
              <tr key={`${item.file.name}-${index}`}>
                <td>{item.file.name}</td>
                <td title={item.error}>{STATUS_WORDS[item.status]}</td>
                <td>{(item.file.size / 1024).toFixed(1)} KB</td>
                <td>{item.status !== 'done' && <Button type="button" size="sm" variant="ghost" onClick={() => queue.remove(index)}>Remove</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Label htmlFor="amc-files" className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">Add Files</Label>
      <input
        id="amc-files"
        type="file"
        multiple
        className="sr-only"
        accept={VENDOR_FILE_TYPES.join(',')}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          pick(files);
        }}
      />
      <p className="text-xs text-muted-foreground">Up to {MAX_AMC_FILES} files, 5 MB each: PDF, JPEG or PNG. They are uploaded when the contract is saved.</p>
    </fieldset>
  );
}
