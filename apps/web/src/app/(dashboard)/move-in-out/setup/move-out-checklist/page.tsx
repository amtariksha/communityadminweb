import { type ReactNode } from 'react';
import { ChecklistSetup } from '../checklist-setup';

// Move In/Out Tracker › Setup › Move Out CheckList (MOVE-S3).
export default function Page(): ReactNode {
  return <ChecklistSetup phase="out" />;
}
