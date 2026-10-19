'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { DocumentEditForm } from '../../edit/document-edit-form';
import { safeReturn } from '../../files/file-roots';

// Admin Files › Edit File (FILE-S4, FILE-11): /documents/:id/edit?return=
function EditFilePage(): ReactNode {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const back = safeReturn(useSearchParams().get('return'), '/documents');

  return (
    <DocumentEditForm mode="page" documentId={id} onClose={() => router.push(back)} onSaved={() => router.push(back)} />
  );
}

export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <EditFilePage />
    </Suspense>
  );
}
