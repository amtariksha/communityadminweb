'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/api-error';
import { printHtml, saveBlob } from '@/lib/download';
import { exportFileName } from './table-text';

export type ServerExportFormat = 'pdf' | 'xlsx' | 'csv';

/**
 * Where the whole filtered result comes from (SB-04 convention): the
 * list's `/export` route with the same filters; the strip adds `format`.
 */
export interface DataTableExport {
  path: string;
  params: Record<string, string>;
  /** File name before the date, e.g. "open-requests". */
  filename: string;
}

interface ExportStripProps {
  config: DataTableExport;
  // Copy and Print work on the visible page, built by the table.
  copyText: () => string;
  printPage: () => string;
  rowCount: number;
}

const FILE_BUTTONS: ReadonlyArray<{ label: string; format: ServerExportFormat }> = [
  { label: 'PDF', format: 'pdf' },
  { label: 'Excel', format: 'xlsx' },
  { label: 'CSV', format: 'csv' },
];

function exportError(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'export_too_large' && error instanceof Error) return error.message;
  return `Could not export: ${friendlyError(error)}`;
}

/** PDF · Copy · Excel · CSV · Print above a shared data table. */
export function ExportStrip({ config, copyText, printPage, rowCount }: ExportStripProps): ReactNode {
  const [busy, setBusy] = useState<ServerExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function downloadFile(format: ServerExportFormat): Promise<void> {
    setBusy(format);
    setError(null);
    setNotice(null);
    try {
      const blob = await api.download(config.path, { params: { ...config.params, format } });
      saveBlob(blob, exportFileName(config.filename, format));
    } catch (failure) {
      setError(exportError(failure));
    } finally {
      setBusy(null);
    }
  }

  async function copyPage(): Promise<void> {
    setError(null);
    try {
      await navigator.clipboard.writeText(copyText());
      setNotice(`Copied ${rowCount} ${rowCount === 1 ? 'row' : 'rows'}.`);
    } catch {
      setNotice(null);
      setError('Could not copy: the browser did not allow access to the clipboard.');
    }
  }

  const fileButton = ({ label, format }: (typeof FILE_BUTTONS)[number]): ReactNode => (
    <Button key={format} type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void downloadFile(format)}>
      {busy === format ? `${label}…` : label}
    </Button>
  );

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Export" className="flex flex-wrap gap-1">
        {fileButton(FILE_BUTTONS[0])}
        <Button type="button" variant="outline" size="sm" onClick={() => void copyPage()}>
          Copy
        </Button>
        {fileButton(FILE_BUTTONS[1])}
        {fileButton(FILE_BUTTONS[2])}
        <Button type="button" variant="outline" size="sm" onClick={() => printHtml(printPage())}>
          Print
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {notice ?? ''}
      </p>
    </div>
  );
}
