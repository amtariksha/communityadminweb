'use client';

import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { useStoredFileUrl } from '@/hooks/use-stored-file';

function NoPreview({ text }: { text: string }): ReactNode {
  return (
    <div className="flex flex-col items-center py-12 text-muted-foreground">
      <FileText className="mb-2 h-10 w-10" />
      <p>{text}</p>
    </div>
  );
}

/** The KYC document (a PDF in a frame, else a picture), through a signed link. */
export function KycDocumentPreview({ documentUrl }: { documentUrl: string | null | undefined }): ReactNode {
  const link = useStoredFileUrl(documentUrl);
  if (link.status === 'none') return <NoPreview text="No document preview available" />;
  if (link.status === 'loading') return <NoPreview text="Loading the document…" />;
  if (!link.url) return <NoPreview text="This file is not available" />;
  return (
    <div className="relative max-h-[70vh] w-full overflow-hidden rounded-md border bg-slate-50 flex items-center justify-center">
      {documentUrl?.toLowerCase().endsWith('.pdf') ? (
        <iframe src={link.url} className="h-[500px] w-full" title="Document PDF" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- signed object-store link on an arbitrary host
        <img src={link.url} alt="ID Document" className="max-h-[500px] w-auto object-contain" />
      )}
    </div>
  );
}
