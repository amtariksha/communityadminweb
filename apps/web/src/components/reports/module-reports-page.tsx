'use client';

import { useMemo, type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useReportCatalogue } from '@/hooks/use-reports';
import { useAdminLayout } from '@/lib/layout-context';
import { CatalogueState } from './catalogue-state';
import { indexSections } from './report-index-model';
import { ReportIndexTable } from './report-index-table';
import { moduleReportsByCatalogue } from './module-reports';
import { PublishSelectedButton, usePublishSelection } from './publish/publish-selection';

/**
 * A module's Reports page (REP-S6): its section of Admin Reports, inside
 * the module frame. `module` is the registry module, e.g. `general_ledger`;
 * `footer` is a line under the list (Gate & Visitors points to the
 * Incident Investigator).
 */
export function ModuleReportsPage({ module, footer }: { module: string; footer?: ReactNode }): ReactNode {
  // The classic module frame names the page; the standard layout needs a header.
  const standard = useAdminLayout() === 'standard';
  return (
    <div className="space-y-4">
      {standard && <PageHeader title="Reports" />}
      <ModuleReports module={module} />
      {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
    </div>
  );
}

function ModuleReports({ module }: { module: string }): ReactNode {
  const catalogue = useReportCatalogue(module);
  const sections = useMemo(() => indexSections(catalogue.data ?? []), [catalogue.data]);
  const from = moduleReportsByCatalogue(module)?.menuId;
  const selection = usePublishSelection();

  if (!catalogue.data) {
    return <CatalogueState loading={catalogue.isLoading} error={catalogue.error} onRetry={() => void catalogue.refetch()} />;
  }
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">No reports for this module yet.</p>;
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PublishSelectedButton rows={catalogue.data} selection={selection} />
      </div>
      {sections.map((section) => (
        <ReportIndexTable key={section.section} section={section} from={from} selection={selection} />
      ))}
    </div>
  );
}
