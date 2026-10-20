'use client';

import { useCallback } from 'react';
import { useAdminLayout } from './layout-context';
import type { AdminLayout } from './admin-layout';

/**
 * Classic word list (requirements SB-14, Part 3.4): the standard word on
 * the left, the word the committee uses on the right. Only words that
 * differ need an entry; anything else is shown as written. Generic words
 * only — never a competitor's product names.
 */
const CLASSIC_WORDS: Readonly<Record<string, string>> = {
  Ticket: 'Request',
  Tickets: 'Requests',
  'New Ticket': 'Create Request',
  'Ticket #': 'Request No.',
  'Assigned To': 'Driven By',
  'Record Receipt': 'Post Collection',
  'Generate Invoices': 'Post Invoice',
  Customers: 'Vendors for Non Member Income',
  Customer: 'Non Member',
  'Audit Trail': 'Logs',
  'Member Dues': 'SubLedgers',
  // Announcement Mgr (ANN-10)
  Author: 'Announcement By',
  'Published On': 'Posted On',
  'Expires On': 'Expiring On',
  Body: 'Brief Description',
  Expired: 'Retired',
  // Expense Tracker (EXP-20): today's /purchases screen inside the module.
  'PR #': 'Purchase Request No.',
  'Bill #': 'Voucher',
  'Vendor Bills': 'Vendor Invoices',
  Reference: 'Instrument No',
  'Reference Number': 'Instrument No',
  'Create Bill': 'Post Invoice',
};

export function wordFor(layout: AdminLayout, standardWord: string): string {
  if (layout !== 'classic') return standardWord;
  return CLASSIC_WORDS[standardWord] ?? standardWord;
}

/** `const word = useWord(); word('Tickets')` → "Requests" in classic. */
export function useWord(): (standardWord: string) => string {
  const layout = useAdminLayout();
  return useCallback((standardWord: string) => wordFor(layout, standardWord), [layout]);
}
