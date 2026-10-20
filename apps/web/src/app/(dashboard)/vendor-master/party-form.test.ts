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

describe('payer fields (INC-46)', () => {
  it('sends the alternate e-mails, Account Head, GST rate and payer type on Add', () => {
    const payload = createPartyPayload({
      ...emptyPartyForm(),
      name: 'Sunrise Events',
      alternate_emails: 'a@example.com, b@example.com',
      default_income_account_id: 'acc-hall',
      payer_type: 'company',
      default_gst_rate: '18',
    });
    expect(payload).toMatchObject({
      alternate_emails: 'a@example.com, b@example.com',
      default_income_account_id: 'acc-hall',
      payer_type: 'company',
      default_gst_rate: 18,
    });
    expect(createPartyPayload({ ...emptyPartyForm(), name: 'X' })).toMatchObject({ payer_type: null, default_gst_rate: null, default_income_account_id: null });
  });

  it('reads them back and sends only what changed', () => {
    const party = { ...PARTY, default_gst_rate: '18.00', payer_type: 'professional', default_income_account_id: 'acc-hall' } as Party;
    const initial = partyFormFromParty(party);
    expect(initial).toMatchObject({ default_gst_rate: '18', payer_type: 'professional', default_income_account_id: 'acc-hall' });
    expect(updatePartyPayload(initial, { ...initial, payer_type: '', default_gst_rate: '5' })).toEqual({ payer_type: null, default_gst_rate: 5 });
  });

  it('checks each alternate e-mail, at most five', () => {
    expect(partyFormError({ ...emptyPartyForm(), name: 'X', alternate_emails: 'a@example.com, nope' })).toBe('nope is not an e-mail address.');
    expect(partyFormError({ ...emptyPartyForm(), name: 'X', alternate_emails: 'a@x.in,b@x.in,c@x.in,d@x.in,e@x.in,f@x.in' })).toMatch(/five/);
    expect(partyFormError({ ...emptyPartyForm(), name: 'X', alternate_emails: ' a@example.com ,b@example.com' })).toBeNull();
  });
});
