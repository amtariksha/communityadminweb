import { Suspense, type ReactNode } from 'react';
import { PayerImportJob } from './payer-import-job';

// Income Tracker › Non Member Income › Bulk Posting › one job (INC-62).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <PayerImportJob />
    </Suspense>
  );
}
