'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { FormBuilder } from '../../_builder/form-builder';
import { FormsPage } from '../../_parts/forms-page';

// Community Forms › Edit Form (FORM-S3).
export default function Page(): ReactNode {
  const params = useParams<{ id: string }>();
  return (
    <FormsPage title="Edit Form" logs={['community_form']}>
      <FormBuilder formId={params.id} />
    </FormsPage>
  );
}
