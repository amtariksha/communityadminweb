import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResidentRecordContent } from './resident-record';

/**
 * MOVE-11 — the resident record: Edit saves through Edit Member, View is
 * read-only, a tenant without a lease row saves an agreement end date (and
 * so leaves No Agreement Filled), a moved-out member offers Re-activate.
 */

const mocks = vi.hoisted(() => ({
  record: undefined as unknown,
  update: vi.fn(),
  remove: vi.fn(),
  reactivate: vi.fn(),
  agreement: vi.fn(),
  fields: null as unknown,
  saveFields: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-resident-record', () => ({
  residentRecordKeys: { record: (id: string) => ['resident-record', id] },
  useResidentRecord: () => ({ isLoading: false, data: mocks.record }),
  useUpdateLeaseAgreement: () => ({ mutate: mocks.agreement, isPending: false }),
}));
vi.mock('@/hooks/use-unit-members', () => ({
  useUpdateMemberDetail: () => ({ mutate: mocks.update, isPending: false }),
  useReactivateMember: () => ({ mutate: mocks.reactivate }),
}));
vi.mock('@/hooks/use-units', () => ({ useRemoveMember: () => ({ mutate: mocks.remove }) }));
vi.mock('@/hooks/use-resident-fields', () => ({
  useMemberFields: () => ({ isLoading: false, data: mocks.fields, dataUpdatedAt: 1 }),
  useSaveMemberFields: () => ({ mutate: mocks.saveFields, isPending: false }),
}));
vi.mock('@/hooks', () => ({ useUploadFileToS3: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('../../units/components/police-verification', () => ({ PoliceVerification: (): ReactNode => <p>Police verification</p> }));

const tenant: Record<string, unknown> = {
  id: 'm-5', unit_id: 'u-5', user_id: 'user-5', member_type: 'tenant', name: 'Test Tenant', phone: '+910000000081', email: null,
  is_current: true, is_primary_contact: false, lives_here: true, is_association_member: false, alternate_address: null,
  move_in_date: '2026-02-01', move_out_date: null, lease_end_date: null, birthdate: null, id_proof_type: null, id_proof_number: null,
  last_login_at: null, app_status: 'never',
};
const record = (member = tenant, lease: unknown = null) => ({
  member,
  unit: { id: 'u-5', unit_number: '505', block: 'E', intercom: null },
  lease,
  kyc: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fields = null;
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('ResidentRecordContent', () => {
  it('saves an agreement end for a tenant with no lease row, on the member', () => {
    mocks.record = record();
    render(<ResidentRecordContent memberId="m-5" readOnly={false} />);

    expect(screen.getByText('No agreement on file.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Agreement End'), { target: { value: '2027-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Agreement End' }));

    expect(mocks.update).toHaveBeenCalledWith({ unitId: 'u-5', memberId: 'm-5', lease_end_date: '2027-01-31' }, expect.anything());
  });

  it('corrects the current lease dates through the agreement route', () => {
    mocks.record = record(tenant, {
      id: 'lease-1', status: 'approved', lease_start_date: '2026-02-01', lease_end_date: '2027-01-31',
      agreement_document_url: null, police_verification_status: 'submitted', police_verification_ref: null,
    });
    render(<ResidentRecordContent memberId="m-5" readOnly={false} />);

    fireEvent.change(screen.getByLabelText('Agreement End'), { target: { value: '2027-03-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Dates' }));

    expect(mocks.agreement).toHaveBeenCalledWith(
      { leaseId: 'lease-1', memberId: 'm-5', lease_start_date: '2026-02-01', lease_end_date: '2027-03-31' },
      expect.anything(),
    );
  });

  it('View is read-only: no form, no save, every input disabled', () => {
    mocks.record = record();
    render(<ResidentRecordContent memberId="m-5" readOnly />);

    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save Agreement End' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    for (const input of screen.queryAllByRole('textbox')) expect((input as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Agreement End') as HTMLInputElement).disabled).toBe(true);
  });

  it('offers Re-activate for a moved-out member', () => {
    mocks.record = record({ ...tenant, is_current: false, move_out_date: '2026-09-30' });
    render(<ResidentRecordContent memberId="m-5" readOnly={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Re-activate' }));

    expect(mocks.reactivate).toHaveBeenCalledWith({ unitId: 'u-5', memberId: 'm-5' }, expect.anything());
  });

  it('Deactivate moves a current resident out after a confirm', () => {
    mocks.record = record();
    render(<ResidentRecordContent memberId="m-5" readOnly={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(mocks.remove).toHaveBeenCalledWith({ unitId: 'u-5', memberId: 'm-5' }, expect.anything());
  });

  it('shows the society fields for the member’s type and saves them (MOVE-15)', () => {
    mocks.record = record();
    mocks.fields = {
      subject_id: 'm-5',
      applies_to: 'tenant',
      fields: [
        { id: 'f-1', key: 'profession', label: 'Profession', type: 'text', choices: null, read_only: false, value: 'Engineer' },
        { id: 'f-2', key: 'rental_agreement_status', label: 'Rental Agreement Status', type: 'single', choices: ['Active'], read_only: true, value: 'No Agreement' },
      ],
    };
    render(<ResidentRecordContent memberId="m-5" readOnly={false} />);

    expect(screen.getByRole('heading', { name: 'Society fields' })).toBeTruthy();
    expect(screen.getByText('No Agreement')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Profession'), { target: { value: 'Architect' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Society Fields' }));
    expect(mocks.saveFields).toHaveBeenCalledWith({ profession: 'Architect' }, expect.anything());
  });

  it('hides the society fields on an older API', () => {
    mocks.record = record();
    render(<ResidentRecordContent memberId="m-5" readOnly={false} />);
    expect(screen.queryByRole('heading', { name: 'Society fields' })).toBeNull();
  });
});
