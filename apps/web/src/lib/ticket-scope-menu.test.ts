import { describe, expect, it } from 'vitest';
import { SUPERVISOR_SIDEBAR_ALLOWLIST, applyTicketScope, isDelegatedTicketRole } from './admin-roles';

/**
 * A security or facility supervisor reaches the helpdesk only while the
 * society's role-delegation switch for their team is on. The server says
 * so (GET /tickets/scope); the menu follows it, and keeps what it shows
 * today whenever the answer is not known.
 */

const security = SUPERVISOR_SIDEBAR_ALLOWLIST.security_supervisor;
const facility = SUPERVISOR_SIDEBAR_ALLOWLIST.facility_supervisor;

describe('applyTicketScope', () => {
  it('takes Tickets away from a supervisor whose switch is off', () => {
    const menu = applyTicketScope(security, 'security_supervisor', { scope: 'none' });

    expect(menu?.has('Tickets')).toBe(false);
    expect(menu?.has('Gate')).toBe(true);
  });

  it('leaves the menu alone while the switch is on', () => {
    expect(applyTicketScope(facility, 'facility_supervisor', { scope: 'teams' })).toBe(facility);
  });

  it('leaves the menu alone while the answer is not known (loading, or an older server)', () => {
    expect(applyTicketScope(security, 'security_supervisor', undefined)).toBe(security);
  });

  it('does not change the shared allowlist', () => {
    applyTicketScope(security, 'security_supervisor', { scope: 'none' });

    expect(security.has('Tickets')).toBe(true);
  });

  it('never touches a role that runs the whole helpdesk', () => {
    const accounts = new Set(['Dashboard', 'Tickets']);

    expect(applyTicketScope(accounts, 'accountant', { scope: 'none' })).toBe(accounts);
    expect(applyTicketScope(null, 'community_admin', { scope: 'none' })).toBeNull();
  });
});

describe('isDelegatedTicketRole', () => {
  it.each([
    ['security_supervisor', true],
    ['facility_supervisor', true],
    ['accountant', false],
    ['community_admin', false],
    [undefined, false],
  ])('%s -> %s', (role, expected) => {
    expect(isDelegatedTicketRole(role)).toBe(expected);
  });
});
