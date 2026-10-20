import type { ReactNode } from 'react';
import { FormBuilder } from '../_builder/form-builder';
import { FormsPage } from '../_parts/forms-page';

// Community Forms › Create Form (FORM-S3): its own page in both layouts.
export default function Page(): ReactNode {
  return (
    <FormsPage title="Create Form">
      <FormBuilder />
    </FormsPage>
  );
}
