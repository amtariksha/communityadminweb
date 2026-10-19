import Link from 'next/link';
import { type ReactNode } from 'react';
import { ModuleReportsPage } from '@/components/reports/module-reports-page';

export default function GateReportsPage(): ReactNode {
  return (
    <ModuleReportsPage
      module="attendance_manager"
      footer={
        <>
          For one visitor&apos;s detail, use the{' '}
          <Link href="/gate/investigator/visitors" className="underline">
            Incident Investigator
          </Link>
          .
        </>
      }
    />
  );
}
