import { Suspense, type ReactNode } from 'react';
import CategoriesContent from './categories-content';

// HelpDesk Tracker › Setup › Setup Helpdesk Categories (HELP-01).
export default function HelpdeskCategoriesPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CategoriesContent />
    </Suspense>
  );
}
