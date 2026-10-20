import { Suspense, type ReactNode } from 'react';
import DirectoryContent from './directory-content';

// The App filter reads ?app_status= (DASH-11), which needs a Suspense boundary.
export default function MemberDirectoryPage(): ReactNode {
  return (
    <Suspense>
      <DirectoryContent />
    </Suspense>
  );
}
