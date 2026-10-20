'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ShowLogsButton } from '@/components/show-logs';
import { isRouteMissing } from '@/lib/not-deployed';
import { useAdminLayout } from '@/lib/layout-context';
import { SURVEYS_LIST } from './labels';

export interface SurveysPageProps {
  title: string;
  logs?: readonly string[];
  /** Standard layout only: classic has them in the module frame (Create Survey, Show Logs). */
  standardActions?: ReactNode;
  children: ReactNode;
}

/**
 * Survey pages (UNIT-S14 / S15). In classic the module frame draws the
 * title, Create Survey, Show Logs and Close from the menu (SB-03); in the
 * standard layout the page draws today's header.
 */
export function SurveysPage({ title, logs, standardActions, children }: SurveysPageProps): ReactNode {
  const layout = useAdminLayout();
  if (layout === 'classic') return <div className="space-y-4">{children}</div>;
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Units', href: '/units' }, { label: 'Surveys', href: SURVEYS_LIST }, { label: title }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {standardActions}
            {logs && logs.length > 0 && <ShowLogsButton recordTypes={logs} />}
          </div>
        }
      />
      {children}
    </div>
  );
}

export const SURVEYS_UNAVAILABLE = 'Surveys are not available yet.';

/** An API without UNIT-32 answers 404 with no code; a missing survey names `survey_not_found`. */
export function SurveyLoadError({ error, missing = 'Survey not found.' }: { error: unknown; missing?: string }): ReactNode {
  const code = (error as { code?: unknown } | null)?.code;
  const text = isRouteMissing(error) ? SURVEYS_UNAVAILABLE : code === 'survey_not_found' ? missing : 'The survey could not be loaded. Reload the page to try again.';
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
