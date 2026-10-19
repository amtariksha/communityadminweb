'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReportCatalogue, type CatalogueRow } from '@/hooks/use-reports';
import { CatalogueState } from './catalogue-state';
import { filterCatalogue, indexSections } from './report-index-model';
import { ReportIndexTable } from './report-index-table';
import { PublishSelectedButton, usePublishSelection, type PublishSelection } from './publish/publish-selection';
import { ReportLogsButton } from './logs/report-logs';

function SearchForm({ onSearch }: { onSearch: (text: string) => void }): ReactNode {
  const [draft, setDraft] = useState('');
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSearch(draft.trim());
  }
  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-2">
      <Input
        type="search"
        aria-label="Search reports"
        placeholder="Search reports"
        className="w-72"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value === '') onSearch('');
        }}
      />
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}

function IndexBody({ rows, search, selection }: { rows: readonly CatalogueRow[]; search: string; selection: PublishSelection }): ReactNode {
  const sections = useMemo(() => indexSections(filterCatalogue(rows, search)), [rows, search]);
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {search ? `No report matches '${search}'` : 'No reports are available to you yet.'}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <ReportIndexTable key={section.section} section={section} selection={selection} />
      ))}
    </div>
  );
}

/**
 * Admin Reports (REP-S1): every report the user may run, in module
 * sections with their fixed numbers. The catalogue is loaded once and
 * searched in the browser.
 */
export function ReportsIndex(): ReactNode {
  const catalogue = useReportCatalogue();
  const [search, setSearch] = useState('');
  const selection = usePublishSelection();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Reports"
        description="Every report of every module, numbered as the committee quotes them."
        actions={
          <>
            <PublishSelectedButton rows={catalogue.data ?? []} selection={selection} />
            <ReportLogsButton reports={catalogue.data ?? []} />
            <Link href="/" className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
              Close
            </Link>
          </>
        }
      />
      <SearchForm onSearch={setSearch} />
      {catalogue.data ? (
        <IndexBody rows={catalogue.data} search={search} selection={selection} />
      ) : (
        <CatalogueState loading={catalogue.isLoading} error={catalogue.error} onRetry={() => void catalogue.refetch()} />
      )}
    </div>
  );
}
