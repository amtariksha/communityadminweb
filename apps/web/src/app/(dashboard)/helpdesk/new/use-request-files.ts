'use client';

import { useCallback, useState } from 'react';
import { useUploadFileToS3 } from '@/hooks';
import { checkFiles } from './request-fields';

export interface AttachedFile {
  id: number;
  file: File;
  state: 'waiting' | 'uploading' | 'done' | 'error';
  percent: number | null;
  url?: string;
}

export interface UploadedFiles {
  urls: string[];
  names: string[];
}

let nextId = 1;

/**
 * Files on a request: checked when picked (type, 8 MB, at most 5), sent to
 * storage when the form is submitted, each with its own progress. A file
 * that fails stays on the list, red with Retry, and holds the request back.
 */
export function useRequestFiles(types?: readonly string[]) {
  const upload = useUploadFileToS3();
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [refused, setRefused] = useState<string[]>([]);

  const patch = useCallback((id: number, changes: Partial<AttachedFile>) => {
    setFiles((current) => current.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));
  }, []);

  function add(picked: readonly File[]): void {
    const check = checkFiles(files.length, picked, types);
    setRefused(check.refused);
    setFiles((current) => [
      ...current,
      ...check.accepted.map((file) => ({ id: nextId++, file, state: 'waiting' as const, percent: null })),
    ]);
  }

  function remove(id: number): void {
    setFiles((current) => current.filter((entry) => entry.id !== id));
  }

  async function send(entry: AttachedFile): Promise<string | null> {
    if (entry.url) return entry.url;
    patch(entry.id, { state: 'uploading', percent: 0 });
    try {
      const result = await upload.mutateAsync({ file: entry.file, onProgress: (percent) => patch(entry.id, { percent }) });
      patch(entry.id, { state: 'done', percent: 100, url: result.fileUrl });
      return result.fileUrl;
    } catch {
      patch(entry.id, { state: 'error' });
      return null;
    }
  }

  /** Uploads what is not uploaded yet; null while any file is still missing. */
  async function uploadAll(): Promise<UploadedFiles | null> {
    const urls: string[] = [];
    for (const entry of files) {
      const url = await send(entry);
      if (!url) return null;
      urls.push(url);
    }
    return { urls, names: files.map((entry) => entry.file.name) };
  }

  function reset(): void {
    setFiles([]);
    setRefused([]);
  }

  return { files, refused, add, remove, retry: send, uploadAll, reset };
}
