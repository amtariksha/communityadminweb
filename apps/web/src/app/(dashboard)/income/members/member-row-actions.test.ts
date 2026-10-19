import { describe, expect, it, vi } from 'vitest';
import { memberRowActions, statementHref } from './member-row-actions';

const ROW = {
  unit_id: 'u-1',
  unit_number: '101',
  block: 'A',
  primary_contact_name: null,
  billing_name: null,
  status: 'due' as const,
  due: '100.00',
  advance: '0.00',
};

describe('Member Income row buttons', () => {
  it('gives finance readers Account History and Print', () => {
    const print = vi.fn();
    const actions = memberRowActions({ canRead: true, canWrite: false }, { print, invoice: vi.fn() });

    expect(actions.map((action) => action.header)).toEqual(['Account History', 'Print']);
    expect(actions[0].href?.(ROW)).toBe(statementHref('u-1'));
    actions[1].onClick?.(ROW);
    expect(print).toHaveBeenCalledWith(ROW);
  });

  it('adds Post Invoice for finance writers', () => {
    const invoice = vi.fn();
    const actions = memberRowActions({ canRead: true, canWrite: true }, { print: vi.fn(), invoice });

    expect(actions.map((action) => [action.header, action.label])).toEqual([
      ['Account History', 'View'],
      ['Post Invoice', 'Invoice'],
      ['Print', 'Print'],
    ]);
    actions[1].onClick?.(ROW);
    expect(invoice).toHaveBeenCalledWith(ROW);
  });

  it('gives others no buttons', () => {
    expect(memberRowActions({ canRead: false, canWrite: false }, { print: vi.fn(), invoice: vi.fn() })).toEqual([]);
  });
});
