'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { parseRoot, rootListHref, safeReturn } from '../files/file-roots';
import { UploadFileForm } from './upload-file-form';

// Admin Files › Upload File (FILE-S3, SB-07):
// /documents/upload?root=admin|residents|unit&folder=&unit_id=&return=
function UploadFilePage(): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const root = parseRoot(params.get('root'));
  const unitId = params.get('unit_id') ?? undefined;
  const back = safeReturn(params.get('return'), rootListHref(root, unitId));

  return (
    <UploadFileForm
      root={root}
      folderId={params.get('folder') ?? undefined}
      unitId={unitId}
      newFolderName={params.get('new_folder') ?? undefined}
      onClose={() => router.push(back)}
      onSaved={() => router.push(back)}
    />
  );
}

export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <UploadFilePage />
    </Suspense>
  );
}
