'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { showingText } from './table-text';

interface DataTablePagerProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

// Page buttons shown around the current page.
const PAGE_WINDOW = 2;

function pageNumbers(page: number, pageCount: number): number[] {
  const first = Math.max(1, page - PAGE_WINDOW);
  const last = Math.min(pageCount, page + PAGE_WINDOW);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** "Showing x to y of z entries", page size, Previous · 1 2 3 · Next. */
export function DataTablePager({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: DataTablePagerProps): ReactNode {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-3">
        <span>{showingText(page, pageSize, total)}</span>
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-muted-foreground" htmlFor="data-table-page-size">
            Show
            <span className="w-20">
              <Select
                id="data-table-page-size"
                value={String(pageSize)}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={String(size)}>
                    {size}
                  </option>
                ))}
              </Select>
            </span>
            entries
          </label>
        )}
      </div>
      <nav aria-label="Pages" className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        {pageNumbers(page, pageCount).map((number) => (
          <Button
            key={number}
            type="button"
            size="sm"
            variant={number === page ? 'default' : 'outline'}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </nav>
    </div>
  );
}
