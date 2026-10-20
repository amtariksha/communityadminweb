import { type ReactNode } from 'react';
import { ChecklistSetup } from '../checklist-setup';

// Move In/Out Tracker › Setup › Move In CheckList (MOVE-S2).
export default function Page(): ReactNode {
  return <ChecklistSetup phase="in" />;
}
