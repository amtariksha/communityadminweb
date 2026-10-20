/** Income Tracker › Non Member Income (INC-S30 – INC-S33): its routes. */
export const NON_MEMBER_BASE = '/income/non-member';

export const NON_MEMBER_BY_DATE = `${NON_MEMBER_BASE}/by-date`;

const payerBase = (customerId: string): string => `${NON_MEMBER_BASE}/payers/${customerId}`;

export const payerStatementHref = (customerId: string): string => `${payerBase(customerId)}/statement`;
export const payerCollectionHref = (customerId: string): string => `${payerBase(customerId)}/collection`;
export const payerEditHref = (customerId: string): string => `${payerBase(customerId)}/edit`;
export const NEW_PAYER_HREF = `${NON_MEMBER_BASE}/payers/new`;
