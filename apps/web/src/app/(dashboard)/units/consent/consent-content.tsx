'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { Select } from '@/components/ui/select';
import {
  CONSENT_CATEGORIES,
  consentLabel,
  consentParams,
  useConsents,
  type ConsentAnswer,
  type ConsentCategory,
  type ConsentRow,
} from '@/hooks/use-consents';
import { isNotDeployed } from '@/lib/not-deployed';
import { ConsentHistoryDialog } from './consent-history-dialog';

const PAGE_SIZE = 100;

const COLUMNS: DataTableColumn<ConsentRow>[] = [
  { key: 'name', header: 'User Name', cell: (row) => row.name ?? '' },
  { key: 'units', header: 'Block & Unit', cell: (row) => row.units },
  { key: 'essential', header: 'Essential Community Updates', cell: (row) => consentLabel(row.essential_updates) },
  { key: 'offers', header: 'Third-Party Deals and Offers', cell: (row) => consentLabel(row.third_party_offers) },
];

function Filters(props: {
  category: ConsentCategory | '';
  answer: ConsentAnswer | '';
  onCategory: (value: ConsentCategory | '') => void;
  onAnswer: (value: ConsentAnswer | '') => void;
}): ReactNode {
  return (
    <div className="flex flex-wrap gap-2">
      <Select aria-label="Category" value={props.category} onChange={(event) => props.onCategory(event.target.value as ConsentCategory | '')}>
        <option value="">All categories</option>
        {CONSENT_CATEGORIES.map((category) => (
          <option key={category.key} value={category.key}>
            {category.label}
          </option>
        ))}
      </Select>
      <Select aria-label="Answer" value={props.answer} onChange={(event) => props.onAnswer(event.target.value as ConsentAnswer | '')}>
        <option value="">Any answer</option>
        <option value="given">Given</option>
        <option value="withdrawn">Withdrawn</option>
        <option value="not_answered">Not answered</option>
      </Select>
    </div>
  );
}

/**
 * Consent Activity (UNIT-37, screen UNIT-S17): each resident's answer to
 * Essential Community Updates and Third-Party Deals and Offers, read-only,
 * on the shared table (SB-04) with its export strip. Residents set their own
 * in the resident app and web.
 */
export function ConsentContent(): ReactNode {
  const [category, setCategory] = useState<ConsentCategory | ''>('');
  const [answer, setAnswer] = useState<ConsentAnswer | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<string | null>(null);
  const query = useConsents({ category, answer, search, page, limit: PAGE_SIZE });
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  if (isNotDeployed(query.error)) {
    return <p className="text-sm text-muted-foreground">Consent Activity is not available yet on this server.</p>;
  }
  const filters = (
    <Filters
      category={category}
      answer={answer}
      onCategory={(value) => {
        setCategory(value);
        setPage(1);
      }}
      onAnswer={(value) => {
        setAnswer(value);
        setPage(1);
      }}
    />
  );
  return (
    <>
      <DataTable<ConsentRow>
        title="Consent Activity"
        serialHeader="Sl No."
        columns={COLUMNS}
        actions={[{ key: 'logs', header: 'Action', label: 'View Logs', onClick: (row) => setViewing(row.user_id) }]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.user_id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={{ value: search, onChange: onSearch, placeholder: 'Name or unit' }}
        filters={filters}
        export={{ path: '/units/consents/export', params: consentParams({ category, answer, search }), filename: 'consent-activity' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No consent answers yet."
      />
      <ConsentHistoryDialog userId={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
