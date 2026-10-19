import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShowLogsButton } from './show-logs';

const TENANT = '11111111-1111-4111-8111-111111111111';
const VENDOR = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const mocks = vi.hoisted(() => ({
  useAuditLog: vi.fn(),
}));

vi.mock('@/hooks/use-audit', () => ({ useAuditLog: mocks.useAuditLog }));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({
      id: 'user-1',
      name: 'Test Admin',
      phone: '+910000000010',
      isSuperAdmin: false,
      role,
      societies: [{ id: TENANT, name: 'Test Society', role }],
    }),
  );
}

const entry = {
  id: 'log-1',
  action: 'update',
  entity_type: 'vendor',
  entity_id: VENDOR,
  old_data: { id: VENDOR, name: 'Old Name', gstin: 'X', updated_at: '2026-10-01' },
  new_data: { id: VENDOR, name: 'New Name', gstin: 'X', updated_at: '2026-10-17' },
  user_name: 'Test Admin',
  ip_address: '127.0.0.1',
  created_at: '2026-10-17T10:00:00Z',
};

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('ShowLogsButton', () => {
  it('lists each change with who, when and only the fields that changed', () => {
    signIn('community_admin');
    mocks.useAuditLog.mockReturnValue({ data: { data: [entry], total: 1 }, isLoading: false });
    render(<ShowLogsButton recordTypes={['vendor']} recordId={VENDOR} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    expect(screen.getByText('Test Admin')).toBeTruthy();
    expect(screen.getByText('Old Name')).toBeTruthy();
    expect(screen.getByText('New Name')).toBeTruthy();
    // Unchanged fields are left out.
    expect(screen.queryByText('gstin')).toBeNull();
  });

  it('asks for the page’s record types and record only once opened', () => {
    signIn('community_admin');
    mocks.useAuditLog.mockReturnValue({ data: undefined, isLoading: true });
    render(<ShowLogsButton recordTypes={['unit', 'member']} recordId={VENDOR} />);

    expect(mocks.useAuditLog).toHaveBeenLastCalledWith(
      { entity_type: 'unit,member', entity_id: VENDOR, limit: 50 },
      { enabled: false },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));
    expect(mocks.useAuditLog).toHaveBeenLastCalledWith(
      { entity_type: 'unit,member', entity_id: VENDOR, limit: 50 },
      { enabled: true },
    );
  });

  it('links to the full history in the audit trail', () => {
    signIn('accountant');
    mocks.useAuditLog.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    render(<ShowLogsButton recordTypes={['vendor']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    expect(screen.getByText('No changes recorded yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open in Audit Trail' }).getAttribute('href')).toBe(
      '/audit?entity_type=vendor',
    );
  });

  it('is not offered to roles that cannot read the audit trail', () => {
    signIn('committee_member');
    mocks.useAuditLog.mockReturnValue({ data: undefined, isLoading: false });
    const { container } = render(<ShowLogsButton recordTypes={['vendor']} />);
    expect(container.innerHTML).toBe('');
  });
  it('can show one kind of change under its own name (UNIT-13 Declined Records)', () => {
    signIn('community_admin');
    mocks.useAuditLog.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    render(<ShowLogsButton recordTypes={['tenant_onboarding']} action="reject" label="Declined Records" />);

    fireEvent.click(screen.getByRole('button', { name: 'Declined Records' }));

    expect(mocks.useAuditLog).toHaveBeenLastCalledWith(
      { entity_type: 'tenant_onboarding', action: 'reject', limit: 50 },
      { enabled: true },
    );
    expect(screen.getByRole('heading', { name: 'Declined Records' })).toBeTruthy();
  });
});
