'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ExportStrip } from '@/components/data-table/export-strip';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { useReportCatalogue, useRunReport, type CatalogueRow, type ReportRunResponse } from '@/hooks/use-reports';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { CatalogueState } from '../catalogue-state';
import { ADMIN_REPORTS_HREF, moduleReportsPage } from '../module-reports';
import { ScheduleCell } from '../report-index-table';
import { ReportOutput } from './report-output';
import { ReportParamField } from './report-param-fields';
import { initialValues, requestParams, type ParamValue } from './report-param-state';
import { reportCopyText, reportPrintHtml } from './report-values';

interface Origin {
  closeHref: string;
  crumbs: ReadonlyArray<{ label: string; href?: string }>;
}

/** Where the page was opened from: a module's Reports page or Admin Reports. */
function originOf(row: CatalogueRow, from: string | undefined): Origin {
  const page = from ? moduleReportsPage(from) : undefined;
  if (page) {
    return { closeHref: page.href, crumbs: [{ label: row.section_title }, { label: 'Reports', href: page.href }] };
  }
  return {
    closeHref: ADMIN_REPORTS_HREF,
    crumbs: [{ label: 'Admin Reports', href: ADMIN_REPORTS_HREF }, { label: row.section_title }],
  };
}

function Breadcrumb({ origin, name }: { origin: Origin; name: string }): ReactNode {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      {origin.crumbs.map((crumb) => (
        <span key={crumb.label}>
          {crumb.href ? (
            <Link href={crumb.href} className="hover:underline">
              {crumb.label}
            </Link>
          ) : (
            crumb.label
          )}
          {' › '}
        </span>
      ))}
      <span className="text-foreground">{name}</span>
    </nav>
  );
}

function runError(error: unknown): string {
  const failure = error as { status?: unknown; code?: unknown } | null;
  if (failure?.status === 404) return 'This report is not available yet.';
  if (failure?.code === 'invalid_report_params' || failure?.code === 'report_not_allowed') return friendlyError(error);
  const code = typeof failure?.code === 'string' ? ` (${failure.code})` : '';
  return `This report could not be produced${code}.`;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
}

function OptionsPanel({ row, onFetch, busy }: { row: CatalogueRow; onFetch: (params: Record<string, unknown>) => void; busy: boolean }): ReactNode {
  const today = todayIST();
  const [values, setValues] = useState<Record<string, ParamValue>>(() => initialValues(row.params, today));
  const [problem, setProblem] = useState<string | null>(null);
  function submit(event: FormEvent): void {
    event.preventDefault();
    const request = requestParams(row.params, values);
    setProblem('error' in request ? request.error : null);
    if ('params' in request) onFetch(request.params);
  }
  return (
    <form aria-label="Report options" onSubmit={submit} className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-3">
        {row.params.map((param) => (
          <ReportParamField
            key={param.key}
            param={param}
            today={today}
            value={values[param.key]}
            onChange={(value) => setValues((current) => ({ ...current, [param.key]: value }))}
          />
        ))}
        <Button type="submit" disabled={busy}>
          {busy ? 'Fetching…' : 'Fetch'}
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
    </form>
  );
}

function Output({ row, response, params }: { row: CatalogueRow; response: ReportRunResponse; params: Record<string, unknown> }): ReactNode {
  const result = response.data;
  return (
    <div className="space-y-3">
      <ExportStrip
        config={{ path: `/report-catalogue/${encodeURIComponent(row.key)}/export`, params: {}, filename: slug(result.title), body: { params } }}
        rowCount={result.sections.reduce((count, section) => count + section.rows.length, 0)}
        copyText={() => reportCopyText(result)}
        printPage={() => reportPrintHtml(result)}
      />
      {result.subtitle && <p className="text-sm text-muted-foreground">{result.subtitle}</p>}
      <ReportOutput result={result} totalRows={response.total_rows} truncated={response.truncated} />
    </div>
  );
}

function ReportRun({ row, from }: { row: CatalogueRow; from?: string }): ReactNode {
  const run = useRunReport(row.key);
  const [applied, setApplied] = useState<Record<string, unknown> | null>(null);
  const origin = originOf(row, from);
  const opened = useRef(false);
  const fetchWith = (params: Record<string, unknown>): void => {
    setApplied(params);
    run.mutate(params);
  };
  // A preset row, or a report without options, runs on open.
  useEffect(() => {
    if (opened.current || row.params.length > 0 || !row.available) return;
    opened.current = true;
    setApplied({});
    run.mutate({});
  }, [row, run]);

  const name = run.data?.data.title ?? row.name;
  return (
    <div className="space-y-4">
      <Breadcrumb origin={origin} name={name} />
      <PageHeader
        title={name}
        actions={
          <>
            {row.schedulable && <ScheduleCell row={row} />}
            <Button type="button" variant="outline" disabled title="Publishing comes with a later release">
              Publish
            </Button>
            <Link href={origin.closeHref} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
              Close
            </Link>
          </>
        }
      />
      {!row.available ? (
        <p className="text-sm text-muted-foreground">This report is planned and not available yet.</p>
      ) : (
        <>
          {row.params.length > 0 && <OptionsPanel row={row} onFetch={fetchWith} busy={run.isPending} />}
          <RunState row={row} run={run} applied={applied} />
        </>
      )}
    </div>
  );
}

function RunState({ row, run, applied }: { row: CatalogueRow; run: ReturnType<typeof useRunReport>; applied: Record<string, unknown> | null }): ReactNode {
  if (run.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {runError(run.error)}
      </p>
    );
  }
  if (run.data && applied) return <Output row={row} response={run.data} params={applied} />;
  if (run.isPending) return <p className="text-sm text-muted-foreground">Fetching…</p>;
  return <p className="text-sm text-muted-foreground">Choose the options and press Fetch</p>;
}

/**
 * A report's run page (REP-S2): its options as a fetch panel, the output as
 * one shared table per section, and the whole result as a file.
 */
export function ReportRunPage({ reportKey }: { reportKey: string }): ReactNode {
  const searchParams = useSearchParams();
  const from = searchParams?.get('from') ?? undefined;
  const catalogue = useReportCatalogue();
  if (!catalogue.data) {
    return <CatalogueState loading={catalogue.isLoading} error={catalogue.error} onRetry={() => void catalogue.refetch()} />;
  }
  const row = catalogue.data.find((candidate) => candidate.key === reportKey);
  if (!row) {
    return <p className="text-sm text-muted-foreground">This report does not exist, or you may not run it.</p>;
  }
  return <ReportRun key={row.key} row={row} from={from} />;
}
