'use client';

import { useState, type ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { friendlyError } from '@/lib/api-error';
import { saveBlob } from '@/lib/download';
import { isNotDeployed } from '@/lib/not-deployed';

interface RequestDownloadsProps {
  /** The list's filters on screen, as its export takes them. */
  params: Record<string, string>;
}

const DOWNLOADS = [
  {
    key: 'job-summary',
    label: 'Print Job Report Summary',
    path: '/tickets/export/job-summary',
    file: 'job-report-summary.pdf',
    extra: {},
    icon: Printer,
  },
  {
    key: 'full-details',
    label: 'Download Full Request Details',
    path: '/tickets/export/full-details',
    file: 'full-request-details.xlsx',
    extra: { format: 'xlsx' },
    icon: Download,
  },
] as const;

/**
 * The two links of Open Requests (HELP-22), over the filters in force:
 * the round's PDF grouped by Serviced By, and every comment in Excel.
 */
export function RequestDownloads({ params }: RequestDownloadsProps): ReactNode {
  const { addToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function fetchFile(download: (typeof DOWNLOADS)[number]): Promise<void> {
    setBusy(download.key);
    try {
      const blob = await api.download(download.path, { params: { ...params, ...download.extra } });
      saveBlob(blob, download.file);
    } catch (error) {
      addToast({
        title: `Could not ${download.label.toLowerCase()}`,
        description: isNotDeployed(error) ? 'Not available yet.' : friendlyError(error),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DOWNLOADS.map((download) => (
        <Button key={download.key} type="button" size="sm" variant="link" disabled={busy !== null} onClick={() => void fetchFile(download)}>
          <download.icon className="mr-1 h-4 w-4" />
          {busy === download.key ? 'Preparing…' : download.label}
        </Button>
      ))}
    </div>
  );
}
