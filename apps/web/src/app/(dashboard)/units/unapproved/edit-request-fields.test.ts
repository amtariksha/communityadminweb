import { describe, expect, it } from 'vitest';
import { checkEditRequest } from './edit-request-fields';

/** Unapproved Users › Edit (UNIT-13): the form's checks before it is sent. */
describe('checkEditRequest', () => {
  const valid = { name: 'Test Applicant', phone: '98 7654 3210', email: '', memberType: 'tenant_family' as const };

  it('sends the phone in +91 form, a blank email as none and the type', () => {
    expect(checkEditRequest(valid)).toEqual({
      errors: {},
      changes: { tenant_name: 'Test Applicant', tenant_phone: '+919876543210', tenant_email: null, member_type: 'tenant_family' },
    });
  });

  it('refuses a missing name or phone, a bad phone and a bad email', () => {
    expect(checkEditRequest({ ...valid, name: ' ' }).errors.name).toBeTruthy();
    expect(checkEditRequest({ ...valid, phone: '' }).errors.phone).toBe('Phone/Mobile is required.');
    expect(checkEditRequest({ ...valid, phone: '12345' }).errors.phone).toBeTruthy();
    expect(checkEditRequest({ ...valid, email: 'not-an-email' }).errors.email).toBe('Enter a valid email.');
    expect(checkEditRequest({ ...valid, email: 'not-an-email' }).changes).toBeUndefined();
  });
});
