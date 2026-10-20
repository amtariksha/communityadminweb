import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialYear } from '@communityos/shared';
import { methodOf } from '@/lib/gst-threshold-method';
import { GstThresholdYearsCard } from './gst-threshold-years-card';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutate: vi.fn(),
  canWrite: true,
  years: [] as FinancialYear[],
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/lib/finance-roles', () => ({ canWriteFinance: () => mocks.canWrite }));
vi.mock('@/hooks', () => ({
  useFinancialYears: () => ({ data: mocks.years, isLoading: false }),
  useSetGstThresholdMethod: () => ({ mutate: mocks.mutate, isPending: false }),
}));

function year(overrides: Partial<FinancialYear>): FinancialYear {
  return {
    id: 'fy-2',
    tenant_id: 't-1',
    label: 'FY2026-27',
    start_date: '2026-04-01' as unknown as Date,
    end_date: '2027-03-31' as unknown as Date,
    is_current: true,
    is_frozen: false,
    gst_threshold_method: 'excess_only',
    ...overrides,
  };
}

const select = (label: string) => screen.getByLabelText(`GST above ₹7,500 for ${label}`) as HTMLSelectElement;

beforeEach(() => {
  mocks.canWrite = true;
  mocks.years = [year({}), year({ id: 'fy-1', label: 'FY2025-26', is_current: false, is_frozen: true, gst_threshold_method: 'whole_amount' })];
});
afterEach(() => vi.clearAllMocks());

describe('GstThresholdYearsCard (INC-16 follow-up)', () => {
  it('shows each year’s method, says a change is for new invoices only, and keeps a frozen year fixed', () => {
    render(<GstThresholdYearsCard />);
    expect(select('FY2026-27').value).toBe('excess_only');
    expect(select('FY2026-27').disabled).toBe(false);
    expect(select('FY2025-26').value).toBe('whole_amount');
    expect(select('FY2025-26').disabled).toBe(true);
    expect(screen.getByText(/invoices already posted keep their GST/)).toBeTruthy();
    expect(screen.getByText(/A frozen year cannot be changed/)).toBeTruthy();
  });

  it('changes an open year’s method and tells the user it applies from now on', () => {
    render(<GstThresholdYearsCard />);
    fireEvent.change(select('FY2026-27'), { target: { value: 'whole_amount' } });
    expect(mocks.mutate).toHaveBeenCalledWith({ id: 'fy-2', method: 'whole_amount' }, expect.anything());
    mocks.mutate.mock.calls[0][1].onSuccess();
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Applies to invoices raised from now on.' }));
  });

  it('says "not available yet" on 404', async () => {
    const { ApiError } = await import('@/lib/api-error');
    render(<GstThresholdYearsCard />);
    fireEvent.change(select('FY2026-27'), { target: { value: 'whole_amount' } });
    mocks.mutate.mock.calls[0][1].onError(new ApiError(404, { statusCode: 404, message: 'Not Found' } as never));
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'This setting is not available yet on this server.' }));
  });

  it('is read-only for a role without finance write', () => {
    mocks.canWrite = false;
    render(<GstThresholdYearsCard />);
    expect(select('FY2026-27').disabled).toBe(true);
    expect(screen.getByText('Only a community admin or accountant can change this.')).toBeTruthy();
  });

  it('shows every year on excess only and changes nothing while the server has no such setting', () => {
    mocks.years = [year({ gst_threshold_method: undefined })];
    render(<GstThresholdYearsCard />);
    expect(methodOf(mocks.years[0])).toBe('excess_only');
    expect(select('FY2026-27').disabled).toBe(true);
    expect(screen.getByText('Changing this is not available yet on this server.')).toBeTruthy();
  });
});
