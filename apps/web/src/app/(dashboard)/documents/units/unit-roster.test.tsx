import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnitRoster } from './unit-roster';

/**
 * Unit Specific Files (FILE-12, screen FILE-S5): every unit, those
 * without files at 0, the total number of files, Upload and View per row.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'committee_member' }));
vi.mock('@/components/block-links', () => ({ UnitBlockLinks: (): ReactNode => null }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));

const summary = vi.hoisted(() => ({ result: {} as Record<string, unknown> }));
vi.mock('@/hooks/use-document-files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-document-files')>()),
  useUnitFileSummary: () => summary.result,
}));

describe('UnitRoster', () => {
  beforeEach(() => {
    summary.result = {
      isLoading: false,
      data: {
        total: 2,
        total_files: 3,
        data: [
          { unit_id: 'u-1', unit_number: 'A-101', block: 'A', name: 'Asha Test', files: 3 },
          { unit_id: 'u-2', unit_number: 'A-102', block: 'A', name: null, files: 0 },
        ],
      },
    };
  });

  it('lists every unit with its files and the total below', () => {
    render(<UnitRoster />);

    const rows = screen.getByRole('table', { name: 'Unit Specific Files' }).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('A-102');
    expect(rows[1].textContent).toContain('0');
    expect(screen.getByText('Total No. of files - 3')).toBeTruthy();
  });

  it('uploads into a unit and opens its files from the row', () => {
    render(<UnitRoster />);

    expect(screen.getAllByRole('link', { name: 'Upload' })[0].getAttribute('href')).toBe(
      `/documents/upload?root=unit&unit_id=u-1&return=${encodeURIComponent('/documents/units')}`,
    );
    expect(screen.getAllByRole('link', { name: 'View' })[0].getAttribute('href')).toBe('/documents/units/u-1');
  });

  it('says the roster is not available on an API without it', () => {
    summary.result = { isLoading: false, error: Object.assign(new Error('Not Found'), { status: 404 }) };
    render(<UnitRoster />);

    expect(screen.getByText('Unit Specific Files is not available yet on this server.')).toBeTruthy();
  });
});
