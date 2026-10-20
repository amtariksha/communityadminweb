import type { ReactNode } from 'react';
import { ViolationsPage } from '../_parts/violations-page';
import { CreateViolationForm } from './create-violation-form';

// Community Rules & Violations › Open Violations › Create Violation (RULE-S7).
export default function Page(): ReactNode {
  return (
    <ViolationsPage title="Create Violation">
      <CreateViolationForm />
    </ViolationsPage>
  );
}
