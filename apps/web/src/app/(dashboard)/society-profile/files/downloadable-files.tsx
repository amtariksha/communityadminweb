'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDocuments } from '@/hooks/use-documents';
import { useDocumentFolders, type DocumentFile } from '@/hooks/use-document-files';
import { canWriteDocuments } from '../../documents/files/file-actions';
import { FileTable } from '../../documents/files/file-table';
import { PublicPageNote } from './public-page-note';

const HERE = '/society-profile/files';
export const DOWNLOADS_FOLDER = 'Downloads';

/**
 * Downloadable Files (PROF-S7): the files of the "Downloads" folder of
 * Admin Files › Resident Documents (decision PROF-D5: members only).
 * Upload File opens the same upload page, the folder pre-set, or created
 * on the first upload.
 */
export function DownloadableFiles(): ReactNode {
  const [page, setPage] = useState(1);
  const folders = useDocumentFolders('residents');
  const downloads = (folders.data ?? []).find((folder) => folder.name.toLowerCase() === DOWNLOADS_FOLDER.toLowerCase());
  const files = useDocuments(
    downloads ? { folder_type: 'common', category_id: downloads.id, page, limit: 25 } : { folder_type: 'none', page: 1, limit: 1 },
  );
  // PROF-42: the upload page offers the Public tick when opened from here.
  const upload = downloads
    ? `/documents/upload?root=residents&folder=${downloads.id}&public=offer&return=${encodeURIComponent(HERE)}`
    : `/documents/upload?root=residents&new_folder=${DOWNLOADS_FOLDER}&public=offer&return=${encodeURIComponent(HERE)}`;

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Files residents can download from the resident app and resident web (folder “{DOWNLOADS_FOLDER}” in Resident
            Documents).
          </p>
          {canWriteDocuments() && (
            <Link href={upload} className={buttonVariants()} data-slot="button" data-size="default">
              Upload File
            </Link>
          )}
        </div>
        <FileTable
          title="Downloadable Files"
          rows={downloads ? ((files.data?.data ?? []) as unknown as DocumentFile[]) : []}
          total={downloads ? (files.data?.total ?? 0) : 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          loading={folders.isLoading || (downloads !== undefined && files.isLoading)}
          error={folders.error ?? (downloads ? files.error : null)}
          emptyText="No downloadable files yet — Upload File adds the first."
          returnTo={HERE}
          showPublic
        />
        <PublicPageNote />
      </CardContent>
    </Card>
  );
}
