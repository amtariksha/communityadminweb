import { describe, expect, it } from 'vitest';
import { createPartyPayload, emptyPartyForm, partyFormError, partyFormFromParty, updatePartyPayload, type Party } from './party-form';

/** The non-member-income party form (VEND-07): Id, TDS, Active; only changes are sent. */

const PARTY = {
  id: 'c-1',
  name: 'Tower Rentals',
  party_code: 'NM-01',
  tds_rate: '10.00',
  tds_section: '393(1)',
  gstin: '29ABCDE1234F1Z5',
  phone: '+910000000052',
  is_active: true,
} as unknown as Party;

describe('party form', () => {
  it('sends every field on Add, blanks as null', () => {
    const payload = createPartyPayload({ ...emptyPartyForm(), name: ' Hall Hire ', party_code: 'NM-02', tds_rate: '2' });
    expect(payload).toMatchObject({ name: 'Hall Hire', party_code: 'NM-02', tds_rate: 2, gstin: null, notes: null });
  });

  it('sends only what changed on Edit, and a cleared field as null', () => {
    const initial = partyFormFromParty(PARTY);
    expect(initial).toMatchObject({ phone: '0000000052', tds_rate: '10' });
    expect(updatePartyPayload(initial, { ...initial, gstin: '', is_active: false, tds_rate: '' })).toEqual({
      gstin: null,
      tds_rate: null,
      is_active: false,
    });
  });

  it('checks the name, the Id and the TDS rate', () => {
    expect(partyFormError(emptyPartyForm())).toBe('Enter the party name.');
    expect(partyFormError({ ...emptyPartyForm(), name: 'X', party_code: 'NM 01' })).toMatch(/Id/);
    expect(partyFormError({ ...emptyPartyForm(), name: 'X', tds_rate: '120' })).toMatch(/TDS/);
    expect(partyFormError({ ...emptyPartyForm(), name: 'X', party_code: 'NM-01/A' })).toBeNull();
  });
});
