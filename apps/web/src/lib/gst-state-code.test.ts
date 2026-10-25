import { describe, expect, it } from 'vitest';
import { editedPartyStateCodeError, GST_STATE_CODES, partyStateCodeError, STATE_CODE_MESSAGE } from './gst-state-code';

/** R5-STATECODE — the party form's state code is a two-digit GST code and agrees with the GSTIN. */
describe('GST state code list', () => {
  it('holds 01 to 38, 97 and 99 only', () => {
    expect(GST_STATE_CODES.size).toBe(40);
    for (const code of ['01', '07', '29', '38', '97', '99']) expect(GST_STATE_CODES.has(code)).toBe(true);
    for (const code of ['00', '39', '96', '98', '7', 'KA']) expect(GST_STATE_CODES.has(code)).toBe(false);
  });
});

describe('partyStateCodeError (Add party)', () => {
  it('refuses a code off the list, such as one digit or letters', () => {
    expect(partyStateCodeError('7', '')).toBe(STATE_CODE_MESSAGE);
    expect(partyStateCodeError('KA', '')).toBe(STATE_CODE_MESSAGE);
    expect(partyStateCodeError('40', '')).toBe(STATE_CODE_MESSAGE);
  });

  it('accepts a listed code, or none', () => {
    expect(partyStateCodeError('07', '')).toBeNull();
    expect(partyStateCodeError('', '29ABCDE1234F1Z5')).toBeNull();
  });

  it('refuses a GSTIN that does not start with the state code', () => {
    expect(partyStateCodeError('27', '29abcde1234f1z5')).toBe(
      'The GSTIN starts with 29 but the state code is 27. They must match.',
    );
    expect(partyStateCodeError('29', '29ABCDE1234F1Z5')).toBeNull();
  });
});

describe('editedPartyStateCodeError (Edit party)', () => {
  it('lets an unrelated edit keep a state code saved before the check', () => {
    expect(editedPartyStateCodeError({ state_code: 'KA', gstin: null }, { stateCode: 'KA', gstin: '' })).toBeNull();
  });

  it('refuses a state code changed to one off the list', () => {
    expect(editedPartyStateCodeError({ state_code: '29', gstin: null }, { stateCode: '7', gstin: '' })).toBe(STATE_CODE_MESSAGE);
  });

  it('refuses a changed GSTIN or state code that leaves the two disagreeing', () => {
    expect(editedPartyStateCodeError({ state_code: '29', gstin: null }, { stateCode: '29', gstin: '27ABCDE1234F1Z5' })).toMatch(
      /starts with 27 but the state code is 29/,
    );
    expect(editedPartyStateCodeError({ state_code: '29', gstin: '29ABCDE1234F1Z5' }, { stateCode: '27', gstin: '29ABCDE1234F1Z5' })).toMatch(
      /starts with 29 but the state code is 27/,
    );
    expect(editedPartyStateCodeError({ state_code: '27', gstin: null }, { stateCode: '29', gstin: '29ABCDE1234F1Z5' })).toBeNull();
  });
});
