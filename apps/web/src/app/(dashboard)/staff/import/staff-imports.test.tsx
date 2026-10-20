import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StaffImportContent } from './[kind]/staff-import-content';
import { staffImport, STAFF_IMPORTS } from './staff-imports';

/** STAFF-S7 — the three uploads, each the SB-13 flow on /staff/imports/<type>. */

let kind = 'attendance';
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ useParams: () => ({ kind }), useRouter: () => ({ push: vi.fn() }), useSearchParams: () => ({ get: () => null }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'community_admin' }));
vi.mock('@/components/import/import-log', () => ({ ImportLog: () => null }));
vi.mock('@/components/import/import-grid', () => ({ ImportGrid: () => <p>grid</p> }));
vi.mock('@/components/import/import-flow', () => ({ ImportFlow: (props: { title: string; target: { type: string } }) => <p>{`${props.title} → ${props.target.type}`}</p> }));

describe('Staff Manager bulk uploads', () => {
  it('opens the chosen upload with links to the other two', () => {
    render(<StaffImportContent />);
    expect(screen.getByText('Upload Attendance → staff_attendance')).toBeTruthy();
    expect(screen.getAllByRole('navigation', { name: 'Staff uploads' })[0].textContent).toBe('Bulk Upload EssentialBulk Upload AdvancedUpload Attendance');
  });

  it('says so for an unknown upload', () => {
    kind = 'payroll';
    render(<StaffImportContent />);
    expect(screen.getByText('No such upload.')).toBeTruthy();
  });

  it('keys every upload on Badge No.', () => {
    expect(STAFF_IMPORTS.every((entry) => entry.columns.some((column) => column.key === 'badge_no'))).toBe(true);
    expect(staffImport('advanced')?.type).toBe('staff_advanced');
  });
});
