'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  openStoredFile,
  peekStoredFileLink,
  storedFileLink,
  type StoredFileOptions,
  type StoredFileSource,
} from '@/lib/stored-file';

/** none: no file · loading: the link is on its way · ready: `url` opens it · unavailable: not for this person. */
export type StoredFileUrlStatus = 'none' | 'loading' | 'ready' | 'unavailable';

export interface StoredFileUrl {
  url: string | null;
  status: StoredFileUrlStatus;
}

function immediate(rawUrl: string | null | undefined, options: StoredFileOptions): StoredFileUrl {
  if (!rawUrl) return { url: null, status: 'none' };
  const held = peekStoredFileLink(rawUrl, options);
  return held ? { url: held, status: 'ready' } : { url: null, status: 'loading' };
}

/** The address to show a stored file at (see lib/stored-file.ts for the rules). */
export function useStoredFileUrl(rawUrl: string | null | undefined, options: StoredFileOptions = {}): StoredFileUrl {
  const { disposition, fileName, tenantId } = options;
  const key = JSON.stringify([rawUrl ?? '', disposition ?? '', fileName ?? '', tenantId ?? '']);
  const [settled, setSettled] = useState<{ key: string; value: StoredFileUrl } | null>(null);
  const current = settled?.key === key ? settled.value : immediate(rawUrl, { disposition, fileName, tenantId });
  const waiting = current.status === 'loading';

  useEffect(() => {
    if (!waiting || !rawUrl) return undefined;
    let live = true;
    void storedFileLink(rawUrl, { disposition, fileName, tenantId }).then((url) => {
      if (live) setSettled({ key, value: url ? { url, status: 'ready' } : { url: null, status: 'unavailable' } });
    });
    return () => {
      live = false;
    };
  }, [key, waiting, rawUrl, disposition, fileName, tenantId]);

  return current;
}

/**
 * Opens a stored file in a new tab, and tells the person when it is not
 * available. Call the returned function straight from the click handler,
 * before any await (lib/stored-file.ts openStoredFile: Safari's popup blocker).
 */
export function useOpenStoredFile(): (source: StoredFileSource, options?: StoredFileOptions) => Promise<void> {
  const { addToast } = useToast();
  return useCallback(
    async (source: StoredFileSource, options?: StoredFileOptions) => {
      try {
        const opened = await openStoredFile(source, options);
        if (!opened) addToast({ title: 'This file is not available', variant: 'destructive' });
      } catch (error) {
        addToast({ title: 'Could not open the file', description: friendlyError(error), variant: 'destructive' });
      }
    },
    [addToast],
  );
}

export interface LocalPreviews {
  /** Shows `file` wherever `storedUrl` is shown, until the page closes. */
  remember: (storedUrl: string, file: File) => void;
  /** The browser's copy of a file picked here, else the stored address itself. */
  previewOf: (storedUrl: string | null | undefined) => string | null | undefined;
}

/**
 * A picture picked and uploaded but not yet saved on its record is shown
 * from the browser's copy: the API signs only files a saved record holds.
 */
export function useLocalPreviews(): LocalPreviews {
  const [previews, setPreviews] = useState<ReadonlyMap<string, string>>(() => new Map());
  const made = useRef<string[]>([]);

  useEffect(() => {
    const held = made.current;
    return () => held.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const remember = useCallback((storedUrl: string, file: File) => {
    if (typeof URL.createObjectURL !== 'function') return;
    const local = URL.createObjectURL(file);
    made.current.push(local);
    setPreviews((current) => new Map(current).set(storedUrl, local));
  }, []);

  const previewOf = useCallback(
    (storedUrl: string | null | undefined) => (storedUrl ? (previews.get(storedUrl) ?? storedUrl) : storedUrl),
    [previews],
  );

  return { remember, previewOf };
}
