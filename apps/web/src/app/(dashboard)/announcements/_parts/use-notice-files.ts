'use client';

import { useCallback, useState } from 'react';
import { useUploadFileToS3 } from '@/hooks';

/**
 * ANN-11 — a notice's files: up to five, JPEG / PNG / WebP / PDF, 8 MB each.
 * Files already on the notice stay as they are; new ones go to storage when
 * the form is saved, each with its own progress.
 */
export const MAX_NOTICE_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const NOTICE_FILE_ACCEPT = ACCEPTED_TYPES.join(',');

export interface NoticeFile {
  id: number;
  name: string;
  /** Set once stored (files already on the notice start stored). */
  url?: string;
  file?: File;
  state: 'stored' | 'waiting' | 'uploading' | 'error';
  percent: number | null;
}

export interface StoredFiles {
  urls: string[];
  names: string[];
}

let nextId = 1;

function refusal(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: only JPEG, PNG, WebP or PDF files can be attached.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: larger than 8 MB.`;
  return null;
}

/** Which picked files may join, and why the others may not. */
export function checkNoticeFiles(attached: number, picked: readonly File[]): { accepted: File[]; refused: string[] } {
  const accepted: File[] = [];
  const refused: string[] = [];
  for (const file of picked) {
    const reason = refusal(file);
    if (reason) refused.push(reason);
    else if (attached + accepted.length >= MAX_NOTICE_FILES) refused.push(`${file.name}: a notice takes at most ${MAX_NOTICE_FILES} files.`);
    else accepted.push(file);
  }
  return { accepted, refused };
}

export function storedFiles(urls: readonly string[] = [], names: readonly string[] = []): NoticeFile[] {
  return urls.map((url, index) => ({ id: nextId++, name: names[index] ?? `Attachment ${index + 1}`, url, state: 'stored', percent: 100 }));
}

export function useNoticeFiles(initial: NoticeFile[] = []) {
  const upload = useUploadFileToS3();
  const [files, setFiles] = useState<NoticeFile[]>(initial);
  const [refused, setRefused] = useState<string[]>([]);

  const patch = useCallback((id: number, changes: Partial<NoticeFile>) => {
    setFiles((current) => current.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));
  }, []);

  function add(picked: readonly File[]): void {
    const check = checkNoticeFiles(files.length, picked);
    setRefused(check.refused);
    setFiles((current) => [
      ...current,
      ...check.accepted.map((file) => ({ id: nextId++, name: file.name, file, state: 'waiting' as const, percent: null })),
    ]);
  }

  function remove(id: number): void {
    setFiles((current) => current.filter((entry) => entry.id !== id));
  }

  async function send(entry: NoticeFile): Promise<string | null> {
    if (entry.url) return entry.url;
    if (!entry.file) return null;
    patch(entry.id, { state: 'uploading', percent: 0 });
    try {
      const result = await upload.mutateAsync({ file: entry.file, onProgress: (percent) => patch(entry.id, { percent }) });
      patch(entry.id, { state: 'stored', percent: 100, url: result.fileUrl });
      return result.fileUrl;
    } catch {
      patch(entry.id, { state: 'error' });
      return null;
    }
  }

  /** Every file stored; null while one could not be. */
  async function storeAll(): Promise<StoredFiles | null> {
    const urls: string[] = [];
    for (const entry of files) {
      const url = await send(entry);
      if (!url) return null;
      urls.push(url);
    }
    return { urls, names: files.map((entry) => entry.name) };
  }

  function reset(next: NoticeFile[] = []): void {
    setFiles(next);
    setRefused([]);
  }

  return { files, refused, add, remove, retry: send, storeAll, reset };
}

export type NoticeFiles = ReturnType<typeof useNoticeFiles>;
