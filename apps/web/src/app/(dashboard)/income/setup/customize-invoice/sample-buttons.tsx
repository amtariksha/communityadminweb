'use client';

import { useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDownloadSample, type SampleType } from '@/hooks/use-billing-documents';
import { ApiError, friendlyError } from '@/lib/api-error';

const SAMPLES: ReadonlyArray<[SampleType, string]> = [
  ['invoice', 'Invoice'],
  ['receipt', 'Receipt'],
  ['credit_note', 'Credit Note'],
];

/** "Post one first" stays as the server says it; a missing route is "not available yet". */
export function sampleMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404 && error.code !== 'no_sample_document') {
    return 'Sample documents are not available yet on this server.';
  }
  return friendlyError(error);
}

/**
 * Customize Invoice › Sample (INC-39): the latest document of each type
 * drawn with today's settings, as a PDF download.
 */
export function SampleButtons(): ReactNode {
  const download = useDownloadSample();
  const [message, setMessage] = useState<string | null>(null);

  async function fetchSample(type: SampleType): Promise<void> {
    setMessage(null);
    try {
      await download.mutateAsync(type);
    } catch (error) {
      setMessage(sampleMessage(error));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Sample:</span>
      {SAMPLES.map(([type, label]) => (
        <Button
          key={type}
          type="button"
          variant="outline"
          size="sm"
          disabled={download.isPending}
          aria-label={`Sample ${label}`}
          onClick={() => void fetchSample(type)}
        >
          <Download className="mr-2 h-4 w-4" />
          {label}
        </Button>
      ))}
      {message && (
        <p role="alert" className="w-full text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
