import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomatedReportsCard, DIGEST_HOURS, digestHour } from './automated-reports-card';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  saveSettings: vi.fn(),
  tenant: null as unknown,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 'tenant-1' }));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/hooks', () => ({
  useTenant: () => ({ data: mocks.tenant }),
  useTenantSettings: () => ({ mutate: mocks.saveSettings, isPending: false }),
}));

beforeEach(() => {
  mocks.tenant = {
    id: 'tenant-1',
    row_version: 7,
    settings_json: {
      scheduled_reports: {
        enabled: true,
        reports: ['trial_balance'],
        recipients: [],
        day_of_month: 5,
        time_of_day: '14:30',
        last_sent_period: '2026-10',
      },
    },
  };
});
afterEach(() => vi.clearAllMocks());

describe('AutomatedReportsCard (REP-01)', () => {
  it('offers whole hours only and shows a stored time as its hour', () => {
    render(<AutomatedReportsCard />);

    const time = screen.getByLabelText('Time of day (IST)') as HTMLSelectElement;
    expect(Array.from(time.options).map((option) => option.value)).toEqual(DIGEST_HOURS);
    expect(time.value).toBe('14:00');
    expect(screen.queryByText(/informational/)).toBeNull();
  });

  it('saves the hour and sends back the month the digest last went out', () => {
    render(<AutomatedReportsCard />);

    fireEvent.change(screen.getByLabelText('Time of day (IST)'), { target: { value: '18:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    const saved = mocks.saveSettings.mock.calls[0][0];
    expect(saved.settings.scheduled_reports).toMatchObject({
      day_of_month: 5,
      time_of_day: '18:00',
      last_sent_period: '2026-10',
    });
    expect(saved.expected_row_version).toBe(7);
  });
});

describe('digestHour', () => {
  it('keeps the hour and falls back to 09:00', () => {
    expect(digestHour('07:45')).toBe('07:00');
    expect(digestHour(undefined)).toBe('09:00');
    expect(digestHour('7pm')).toBe('09:00');
  });
});
