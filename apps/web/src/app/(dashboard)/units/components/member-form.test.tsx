import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemberForm } from './member-form';
import { memberChanges, memberFormErrors, memberFormValues, memberTags } from './member-form-values';

/**
 * UNIT-15 — Edit Member gains Primary Contact, Lives Here, Association
 * Member and Alternate Address; an edit sends only what changed.
 */

const TENANT = memberFormValues({
  name: 'Test Tenant',
  phone: '+910000000021',
  email: '',
  member_type: 'tenant',
  is_primary_contact: false,
  lives_here: true,
  is_association_member: false,
  alternate_address: null,
  lease_end_date: '2027-03-31',
});

describe('member form values', () => {
  it('sends only the changed fields', () => {
    const changes = memberChanges(TENANT, { ...TENANT, is_association_member: true, alternate_address: ' 9 Test Road ' });

    expect(changes).toEqual({ is_association_member: true, alternate_address: '9 Test Road' });
  });

  it('never re-sends an unchanged phone', () => {
    expect(memberChanges(TENANT, { ...TENANT, name: 'Renamed Tenant' })).toEqual({ name: 'Renamed Tenant' });
  });

  it('asks for a phone for an owner or tenant and refuses an address over 500 characters', () => {
    const errors = memberFormErrors({ ...TENANT, phone: '', alternate_address: 'x'.repeat(501) });

    expect(errors.phone).toMatch(/required/);
    expect(errors.alternate_address).toMatch(/500/);
  });

  it('tags a card with Primary Contact, Lives Here and Association Member', () => {
    expect(memberTags({ is_primary_contact: true, lives_here: true, is_association_member: true })).toEqual([
      'Primary Contact',
      'Lives Here',
      'Association Member',
    ]);
    expect(memberTags({ is_primary_contact: false, lives_here: false })).toEqual([]);
  });
});

describe('MemberForm', () => {
  it('shows the four member fields and warns that primary contact moves', () => {
    render(<MemberForm mode="page" initial={TENANT} otherPrimaryName="Test Owner" onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByLabelText('Lives Here')).toBeTruthy();
    expect(screen.getByLabelText('Association Member')).toBeTruthy();
    expect(screen.getByLabelText('Alternate Address')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Primary Contact'));

    expect(screen.getByRole('note').textContent).toContain('Test Owner');
  });

  it('saves the primary contact tick as the only change', () => {
    const onSave = vi.fn();
    render(<MemberForm mode="page" initial={TENANT} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText('Primary Contact'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({ is_primary_contact: true });
  });
});
