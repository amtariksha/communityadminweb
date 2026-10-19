import type { DataTableColumn } from '@/components/data-table';
import type { Announcement } from '@/hooks';
import { formatDate } from '@/lib/utils';
import { blocksLabel, briefDescription, recipientsLabel, typeLabel } from '../_parts/labels';

export type ClassicList = 'awaiting' | 'active' | 'retired';

/**
 * The columns of the classic lists (ANN-S2 … S4), in their order; the
 * serial column comes from the table. `word` gives the classic words
 * (Posted On, Expiring On, Announcement By, Brief Description).
 */
export function noticeColumns(list: ClassicList, word: (w: string) => string): DataTableColumn<Announcement>[] {
  const posted: DataTableColumn<Announcement> =
    list === 'awaiting'
      ? { key: 'submitted', header: 'Submitted On', cell: (row) => formatDate(row.submitted_at ?? row.created_at) }
      : { key: 'posted', header: word('Published On'), cell: (row) => formatDate(row.published_at) };
  const expiring: DataTableColumn<Announcement> = {
    key: 'expires',
    header: word('Expires On'),
    cell: (row) => (row.expires_at ? formatDate(row.expires_at) : 'No expiry'),
  };
  const audience: DataTableColumn<Announcement>[] =
    list === 'retired'
      ? []
      : [
          { key: 'recipients', header: 'Announcement Recipients', cell: (row) => recipientsLabel(row) },
          { key: 'block', header: 'Block', cell: (row) => blocksLabel(row) },
        ];
  return [
    posted,
    expiring,
    ...audience,
    { key: 'by', header: word('Author'), cell: (row) => row.author_name ?? '—' },
    { key: 'brief', header: word('Body'), cell: (row) => briefDescription(row.body) },
    { key: 'type', header: 'Type', cell: (row) => typeLabel(row) },
  ];
}
