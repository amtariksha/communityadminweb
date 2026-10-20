import { describe, expect, it } from 'vitest';
import { createReceiptSchema } from '@communityos/shared';

/** INC-45 — the shared copy of POST /receipts: from a unit or a non-member payer, exactly one. */
const UNIT = '11111111-1111-4111-8111-111111111111';
const PAYER = '22222222-2222-4222-8222-222222222222';
const body = { financial_year_id: '', receipt_date: '2026-10-20', amount: 500, mode: 'cash' };

describe('createReceiptSchema', () => {
  it('takes a unit or a payer', () => {
    expect(createReceiptSchema.safeParse({ ...body, unit_id: UNIT }).success).toBe(true);
    expect(createReceiptSchema.safeParse({ ...body, customer_id: PAYER, allocation_mode: 'fifo' }).success).toBe(true);
  });

  it('refuses both, or neither', () => {
    expect(createReceiptSchema.safeParse({ ...body, unit_id: UNIT, customer_id: PAYER }).success).toBe(false);
    expect(createReceiptSchema.safeParse(body).success).toBe(false);
  });
});
