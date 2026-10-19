import { describe, expect, it } from 'vitest';
import { emptyMultiLineForm, multiLineErrors, multiLineTotals, toMultiLinePayload, type MultiLineForm } from './multi-line-state';

function form(lines: Array<Partial<MultiLineForm['lines'][number]>>, patch: Partial<MultiLineForm> = {}): MultiLineForm {
  const base = emptyMultiLineForm('2026-10-15', '2026-10-25');
  lines.forEach((line, index) => {
    base.lines[index] = { ...base.lines[index], ...line };
  });
  return { ...base, ...patch };
}

describe('Multi-Line invoice grid', () => {
  const two = [
    { ledgerAccountId: 'hall', quantity: '2', amount: '500', gstRate: '18' },
    { ledgerAccountId: 'chairs', quantity: '1', amount: '300', gstRate: '0' },
  ];

  it('totals 2 × ₹500 at 18% and 1 × ₹300 at 0% to ₹1,480 on the GST page', () => {
    expect(multiLineTotals(form(two), true)).toEqual({ subtotal: 1300, gst: 180, total: 1480 });
    expect(multiLineTotals(form(two), false)).toEqual({ subtotal: 1300, gst: 0, total: 1300 });
  });

  it('applies the same GST to every line when chosen', () => {
    const same = form(two, { sameGst: '5' });
    expect(multiLineTotals(same, true).gst).toBe(65);
    expect(toMultiLinePayload('u', same, true)).toMatchObject({ apply_same_gst: 5 });
  });

  it('ignores blank lines and asks for at least one', () => {
    expect(toMultiLinePayload('u', form(two), true).lines).toHaveLength(2);
    expect(multiLineErrors(form([])).lines).toBe('Add at least one line.');
  });

  it('names the line that is incomplete', () => {
    expect(multiLineErrors(form([{ amount: '100' }]))['lines.0']).toBe('Pick the account');
    expect(multiLineErrors(form([{ ledgerAccountId: 'a', amount: '0' }]))['lines.0']).toMatch(/Amount/);
    expect(multiLineErrors(form(two, { dueDate: '2026-10-01' })).dueDate).toBeDefined();
  });

  it('sends no GST rates from the plain page', () => {
    const payload = toMultiLinePayload('u', form(two), false);
    expect(payload.with_gst).toBe(false);
    expect(payload.lines[0]).not.toHaveProperty('gst_rate');
  });
});
