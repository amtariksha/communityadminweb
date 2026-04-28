'use client';

import { type ReactNode } from 'react';
import { Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';

/**
 * QA #204 — Salaries module is not built yet but testers expected
 * to find it under Staff. Render a discoverable placeholder so the
 * sidebar link doesn't 404; the real implementation lives in a
 * separate feature batch.
 */
export default function SalariesPlaceholder(): ReactNode {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Staff', href: '/staff' }, { label: 'Salaries' }]}
        title="Salaries"
        description="Monthly salary processing for security guards, housekeeping, and other society staff."
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Coming soon</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Salary processing — salary structures, monthly run, payslip
            export, statutory deductions, and bank-transfer batches —
            ships in a future release. Until then continue tracking
            payroll outside the platform; existing per-employee
            salary fields under <strong>Staff → Employees</strong> still
            store the agreed monthly amount for reference.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
