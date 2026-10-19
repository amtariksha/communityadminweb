import { describe, expect, it } from 'vitest';
import { financeAccessFor } from './finance-roles';

describe('financeAccessFor', () => {
  it.each(['community_admin', 'accountant', 'super_admin'])('lets %s read and post', (role) => {
    expect(financeAccessFor(role)).toEqual({ canRead: true, canWrite: true });
  });

  it.each(['committee_member', 'auditor'])('lets %s read only', (role) => {
    expect(financeAccessFor(role)).toEqual({ canRead: true, canWrite: false });
  });

  it.each(['owner', 'security_guard', 'moderator', null])('gives %s neither', (role) => {
    expect(financeAccessFor(role)).toEqual({ canRead: false, canWrite: false });
  });
});
