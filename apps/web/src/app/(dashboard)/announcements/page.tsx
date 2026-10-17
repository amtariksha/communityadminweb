import { Suspense, type ReactNode } from 'react';
import AnnouncementsContent from './announcements-content';

export default function AnnouncementsPage(): ReactNode {
  // useSearchParams (the ?new=1 deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AnnouncementsContent />
    </Suspense>
  );
}
