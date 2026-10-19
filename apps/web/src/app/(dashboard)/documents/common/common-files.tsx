'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDocuments } from '@/hooks/use-documents';
import { useDocumentFolders, type DocumentFile, type DocumentRoot } from '@/hooks/use-document-files';
import { canWriteDocuments } from '../files/file-actions';
import { FileTable } from '../files/file-table';
import { FolderList } from './folder-list';

const ROOTS: Readonly<Record<DocumentRoot, { title: string; note: string; folderType: 'committee' | 'common' }>> = {
  admin: {
    title: 'Admin Documents',
    note: 'Only people with admin access can see these files.',
    folderType: 'committee',
  },
  residents: {
    title: 'Resident Documents',
    note: 'Shared with residents — they find these under Documents in the resident app and resident web.',
    folderType: 'common',
  },
};

const DEFAULT_PAGE_SIZE = 25;

/** The folder shown: the one in the link, else the first holding files, else the first. */
function shownFolder(folders: readonly { id: string; file_count: number }[], picked: string | null): string | null {
  if (picked && folders.some((folder) => folder.id === picked)) return picked;
  return (folders.find((folder) => folder.file_count > 0) ?? folders[0])?.id ?? null;
}

/**
 * Admin Files › Common Files (FILE-S1, FILE-S2): the folders of one root
 * on the left with their counts, the selected folder's files on the right.
 * The folder is in the link (`?folder=`), so a reload keeps it.
 */
export function CommonFiles({ root }: { root: DocumentRoot }): ReactNode {
  const config = ROOTS[root];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const foldersQuery = useDocumentFolders(root);
  const folders = foldersQuery.data ?? [];
  const folderId = shownFolder(folders, params.get('folder'));
  const files = useDocuments({
    folder_type: config.folderType,
    category_id: folderId ?? undefined,
    search: search || undefined,
    page,
    limit: pageSize,
  });

  function selectFolder(id: string): void {
    setPage(1);
    router.replace(`${pathname}?folder=${id}`);
  }

  const here = folderId ? `${pathname}?folder=${folderId}` : pathname;
  const upload = `/documents/upload?root=${root}${folderId ? `&folder=${folderId}` : ''}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{config.note}</p>
        {canWriteDocuments() && (
          <Link href={upload} className={buttonVariants()} data-slot="button" data-size="default">
            Upload File
          </Link>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <Card>
          <CardContent className="pt-4">
            <FolderList folders={folders} loading={foldersQuery.isLoading} selectedId={folderId} onSelect={selectFolder} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <FileTable
              title={config.title}
              rows={(files.data?.data ?? []) as unknown as DocumentFile[]}
              total={files.data?.total ?? 0}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: 'Search files' }}
              loading={files.isLoading}
              error={files.error}
              onRetry={() => void files.refetch()}
              emptyText={folders.length === 0 ? 'No folders yet — Upload File creates one.' : 'No files in this folder.'}
              showAudience={root === 'residents'}
              returnTo={here}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
