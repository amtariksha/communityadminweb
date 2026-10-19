import { describe, expect, it } from 'vitest';
import type { CatalogueParam } from '@/hooks/use-reports';
import { initialValues, requestParams } from './report-param-state';

/**
 * An optional option left alone filters nothing (HELP-21): "All Open
 * Requests" without an Opened On range lists every open request, and an
 * optional Status starts on All rather than on its first value.
 */

const TODAY = '2026-10-19';

const opened: CatalogueParam = { key: 'opened', label: 'Opened On', type: 'date_range', required: false };
const status: CatalogueParam = {
  key: 'status',
  label: 'Status',
  type: 'select',
  required: false,
  options: [
    { value: 'open', label: 'New' },
    { value: 'closed', label: 'Closed' },
  ],
};
const period: CatalogueParam = { key: 'period', label: 'Period', type: 'date_range', required: true, default: 'current_fy' };
const split: CatalogueParam = {
  key: 'split',
  label: 'Split',
  type: 'select',
  required: true,
  options: [{ value: 'monthly', label: 'Monthly' }],
};

describe('report options left alone', () => {
  it('send no optional range and no optional choice', () => {
    const values = initialValues([opened, status], TODAY);

    expect(requestParams([opened, status], values)).toEqual({ params: {} });
  });

  it('still send a required range and a required choice', () => {
    const values = initialValues([period, split], TODAY);

    expect(requestParams([period, split], values)).toEqual({ params: { period: 'current_fy', split: 'monthly' } });
  });

  it('send an optional choice once one is picked', () => {
    const values = { ...initialValues([status], TODAY), status: 'closed' };

    expect(requestParams([status], values)).toEqual({ params: { status: 'closed' } });
  });
});
