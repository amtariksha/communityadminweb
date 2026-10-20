import { Suspense, type ReactNode } from 'react';
import { ResponsesList } from '../responses-list';

// Community Forms › Responses › Rejected (FORM-S4).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ResponsesList status="rejected" />
    </Suspense>
  );
}
