import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResidentRegister } from './resident-register';

/**
 * MOVE-08 / -09 / -10, UNIT-18 — the registers over the member directory:
 * each preset's columns and filters, block links that put the block in the
 * URL, the whole-result export, and "not available" on an older API.
 */

const state = vi.hoisted(() => ({
  block: null as string | null,
  rows: [] as Array<Record<string, unknown>>,
  total: 0,
  calls: [] as Array<Record<string, unknown>>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/move-in-out/owners',
  useSearchParams: () => ({ get: (key: string) => (key === 'block' ? state.block : null) }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/block-links', () => ({
  UnitBlockLinks: ({ hrefFor }: { hrefFor: (block: string | null) => string }): ReactNode => <a href={hrefFor('C')}>Block C</a>,
}));
vi.mock('@/hooks/use-unit-members', async (actual) => ({
  ...(await actual<typeof import('@/hooks/use-unit-members')>()),
  useMemberDirectory: (filters: Record<string, unknown>) => {
    state.calls.push(filters);
    return { isLoading: false, data: { data: state.rows, total: state.total }, refetch: vi.fn() };
  },
}));
vi.mock('@/components/data-table', () => ({
  DataTable: (props: {
    title: string;
    columns: Array<{ key: string; header: string; cell: (row: unknown) => ReactNode }>;
    rows: unknown[];
    actions: Array<{ label: string; href: (row: unknown) => string }>;
    export: { path: string; params: Record<string, string> };
    emptyText: string;
  }): ReactNode => (
    <section aria-label={props.title}>
      <p data-testid="headers">{props.columns.map((column) => column.header).join('|')}</p>
      <p data-testid="export">{`${props.export.path}?${new URLSearchParams(props.export.params).toString()}`}</p>
      {props.rows.length === 0 && <p>{props.emptyText}</p>}
      {props.rows.map((row, index) => (
        <div key={index} data-testid="row">
          {props.columns.map((column) => (
            <span key={column.key}>{column.cell(row)}</span>
          ))}
          <a href={props.actions[0].href(row)}>{props.actions[0].label}</a>
        </div>
      ))}
    </section>
  ),
}));

const owner = {
  id: 'm-1', unit_id: 'u-1', unit_number: '301', block: 'C', name: 'Test Owner', phone: '+910000000071', email: null,
  member_type: 'owner', move_in_date: '2025-04-01', is_primary_contact: true, lease_end_date: null, roles: ['owner'],
  intercom: '3301', app_status: 'never', lives_here: true, is_association_member: false, last_login_at: null,
};

beforeEach(() => {
  state.block = null;
  state.rows = [owner];
  state.total = 1;
  state.calls = [];
});

const headers = () => screen.getByTestId('headers').textContent;

describe('ResidentRegister', () => {
  it('Approved Owners: owners only, the register columns, Edit opens the record', () => {
    render(<ResidentRegister preset="owners" />);

    expect(state.calls[0]).toMatchObject({ member_type: 'owner', page: 1, limit: 100 });
    expect(headers()).toBe('Unit|Name|Intercom|User Status|Lives Here|Primary Contact|LastLog|Assoc. Member');
    const row = screen.getByTestId('row');
    expect(row.textContent).toContain('C-301');
    expect(row.textContent).toContain('Never logged in');
    expect(within(row).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/move-in-out/residents/m-1');
  });

  it('narrows to the block in the URL and exports the whole filtered result', () => {
    state.block = 'C';
    render(<ResidentRegister preset="owners" />);

    expect(state.calls[0]).toMatchObject({ block: 'C' });
    expect(screen.getByRole('link', { name: 'Block C' }).getAttribute('href')).toBe('/move-in-out/owners?block=C');
    expect(screen.getByTestId('export').textContent).toBe('/units/directory/members/export?member_type=owner&block=C');
  });

  it.each([
    ['ending', 'ending_this_month', 'Agreement Start'],
    ['ended', 'ended', 'Agreement End'],
    ['no_agreement', 'none', 'Last Login'],
  ] as const)('agreement tab %s asks for tenants with agreement=%s', (preset, agreement, column) => {
    render(<ResidentRegister preset={preset} />);

    expect(state.calls[0]).toMatchObject({ member_type: 'tenant', agreement });
    expect(headers()).toContain(column);
  });

  it('No Agreement Filled opens the record read-only (View)', () => {
    render(<ResidentRegister preset="no_agreement" />);

    expect(screen.getByRole('link', { name: 'View' }).getAttribute('href')).toBe('/move-in-out/residents/m-1?view=1');
  });

  it('the deactivated registers ask for past members with their own columns', () => {
    render(<ResidentRegister preset="deactivated_users" />);

    expect(state.calls[0]).toMatchObject({ status: 'past' });
    expect(headers()).toBe('Name|Email|Intercom|Block|Unit|Owner/Tenant|Joined On|Deactivated Date');
  });

  it('says the register is not available on an API that ignores its filters', () => {
    state.rows = [{ ...owner, app_status: undefined }];
    render(<ResidentRegister preset="deactivated" />);

    expect(screen.getByText('This register is not available yet on this server.')).toBeTruthy();
    expect(screen.queryByTestId('row')).toBeNull();
  });
});
