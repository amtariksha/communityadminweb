import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadingsTab } from './utilities-content';

/**
 * UTIL-16 — the readings upload (SB-13, release 3) replaced the old
 * paste-CSV dialog: the Readings tab links to the Excel upload and offers
 * no paste box.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-ocr', () => ({ useOcrMeterReading: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/components/utilities/meter-consumption-chart', () => ({ MeterConsumptionChart: () => null }));
vi.mock('./bills-tab', () => ({ BillsTab: () => null }));
vi.mock('./income/utility-income-content', () => ({ UtilityIncomeContent: () => null }));
vi.mock('./meters-tab', () => ({ MetersTab: () => null }));
vi.mock('./slab-rates-tab', () => ({ SlabRatesTab: () => null }));
vi.mock('@/hooks', () => ({
  useUtilityStats: () => ({ data: undefined, isLoading: false }),
  useMeters: () => ({ data: [], isLoading: false }),
  useReadings: () => ({ data: { data: [] }, isLoading: false }),
  useSubmitReading: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('Utilities › Readings', () => {
  it('links to the Excel readings upload and has no paste-CSV dialog', () => {
    render(<ReadingsTab />);

    expect(screen.getByRole('link', { name: /Upload readings \(Excel\)/ }).getAttribute('href')).toBe('/utilities/bulk-posting/excel');
    expect(screen.queryByRole('button', { name: /Paste CSV/i })).toBeNull();
    expect(screen.queryByText(/Bulk CSV Upload/)).toBeNull();
  });
});
