'use client';

import { useRef, useState, type RefObject } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  downloadImportTemplate,
  IMPORT_MAX_FILE_BYTES,
  useImportApply,
  useImportPreview,
  type ImportCommitResult,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportTarget,
} from '@/hooks/use-imports';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

export type ImportStep =
  | { kind: 'idle' }
  | { kind: 'previewed'; preview: ImportPreview }
  | { kind: 'refused'; rows: ImportPreviewRow[]; message: string }
  | { kind: 'applied'; result: ImportCommitResult }
  | { kind: 'unavailable' };

function refusedRows(error: unknown): ImportPreviewRow[] | null {
  if (!(error instanceof ApiError) || error.code !== 'import_rows_invalid') return null;
  const rows = (error.details as { rows?: ImportPreviewRow[] } | undefined)?.rows;
  return Array.isArray(rows) ? rows : [];
}

export interface ImportFlowState {
  step: ImportStep;
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  previewing: boolean;
  pick: (file: File | null) => void;
  runPreview: () => Promise<void>;
  runApply: (preview: ImportPreview) => Promise<void>;
  template: (format: 'xlsx' | 'csv') => Promise<void>;
}

/** The steps of one SB-13 upload: pick → preview → commit, with the "not deployed" and refused states. */
export function useImportFlow(target: ImportTarget, options: Record<string, unknown> | undefined, onApplied?: (result: ImportCommitResult) => void): ImportFlowState {
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ImportStep>({ kind: 'idle' });
  const preview = useImportPreview(target);
  const apply = useImportApply(target);
  const fail = (title: string, error: unknown): void => {
    if (isNotDeployed(error)) setStep({ kind: 'unavailable' });
    else addToast({ title, description: friendlyError(error), variant: 'destructive' });
  };

  function pick(next: File | null): void {
    setStep({ kind: 'idle' });
    const tooBig = next !== null && next.size > IMPORT_MAX_FILE_BYTES;
    if (tooBig) {
      addToast({ title: 'The file is larger than 4.5 MB', description: 'Split it and upload each part.', variant: 'destructive' });
      if (inputRef.current) inputRef.current.value = '';
    }
    setFile(tooBig ? null : next);
  }

  async function runPreview(): Promise<void> {
    if (!file) return;
    try {
      setStep({ kind: 'previewed', preview: await preview.mutateAsync({ file, options }) });
    } catch (error) {
      fail('Could not read the file', error);
    }
  }

  async function runApply(current: ImportPreview): Promise<void> {
    if (!file) return;
    try {
      const result = await apply.mutateAsync({ file, options, batchId: current.batch_id });
      setStep({ kind: 'applied', result });
      onApplied?.(result);
    } catch (error) {
      const rows = refusedRows(error);
      if (rows) setStep({ kind: 'refused', rows, message: friendlyError(error) });
      else fail('Nothing was saved', error);
    }
  }

  async function template(format: 'xlsx' | 'csv'): Promise<void> {
    try {
      await downloadImportTemplate(target, format);
    } catch (error) {
      fail('Could not download the template', error);
    }
  }

  return { step, file, inputRef, busy: preview.isPending || apply.isPending, previewing: preview.isPending, pick, runPreview, runApply, template };
}
