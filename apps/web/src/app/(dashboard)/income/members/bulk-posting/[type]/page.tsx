import { Suspense, type ReactNode } from 'react';
import { MemberImportJob } from './import-job';

// Income Tracker › Member Income › Bulk Posting › one job (INC-56 … INC-60).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <MemberImportJob />
    </Suspense>
  );
}
