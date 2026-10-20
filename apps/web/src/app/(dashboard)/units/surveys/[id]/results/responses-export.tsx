'use client';

import { useState, type ReactNode } from 'react';
import { exportError } from '@/components/data-table/export-strip';
import { exportFileName } from '@/components/data-table/table-text';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { saveBlob } from '@/lib/download';

type ResponsesFormat = 'xlsx' | 'csv';

const FORMATS: ReadonlyArray<{ label: string; format: ResponsesFormat }> = [
  { label: 'Excel', format: 'xlsx' },
  { label: 'CSV', format: 'csv' },
];

/** Export responses (UNIT-33): one row per response with every answer, built by the server. */
export function ResponsesExport({ surveyId }: { surveyId: string }): ReactNode {
  const [busy, setBusy] = useState<ResponsesFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ResponsesFormat): Promise<void> {
    setBusy(format);
    setError(null);
    try {
      const blob = await api.download(`/surveys/${surveyId}/responses/export`, { params: { format } });
      saveBlob(blob, exportFileName('survey-responses', format));
    } catch (failure) {
      setError(exportError(failure));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1">
      <div role="group" aria-label="Export responses" className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Export responses</span>
        {FORMATS.map(({ label, format }) => (
          <Button key={format} type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download(format)}>
            {busy === format ? 'Exporting…' : label}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
