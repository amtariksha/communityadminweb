import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuesRemindersCard } from './dues-reminders-card';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  mutate: vi.fn(),
  settings: {} as Record<string, unknown>,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks/use-tenants', () => ({
  useTenant: () => ({ data: { id: TENANT, settings_json: mocks.settings } }),
  useTenantSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

function signIn(role: string, isSuperAdmin = false): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({
      id: 'user-1',
      name: 'Test Admin',
      phone: '+910000000010',
      isSuperAdmin,
      role,
      societies: [{ id: TENANT, name: 'Test Society', role }],
    }),
  );
}

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DuesRemindersCard />
    </QueryClientProvider>,
  );
}

function daySelect(slot: number): HTMLSelectElement {
  return screen.getByLabelText(`Reminder day ${slot}`) as HTMLSelectElement;
}

function pickDay(slot: number, day: number): void {
  fireEvent.change(daySelect(slot), { target: { value: String(day) } });
}

function saveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Save reminders' }) as HTMLButtonElement;
}

beforeEach(() => {
  mocks.settings = {};
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('DuesRemindersCard', () => {
  it('starts off with no days when the society has never saved reminders', () => {
    signIn('community_admin');
    renderCard();

    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect([1, 2, 3, 4].map((slot) => daySelect(slot).value)).toEqual(['0', '0', '0', '0']);
    expect(saveButton().disabled).toBe(true);
  });

  it('shows the saved switch and days', () => {
    mocks.settings = { billing_reminders: { enabled: true, days: [20, 5] } };
    signIn('community_admin');
    renderCard();

    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect([1, 2, 3, 4].map((slot) => daySelect(slot).value)).toEqual(['5', '20', '0', '0']);
  });

  it('saves both fields with distinct, sorted days and no zeros', () => {
    signIn('community_admin');
    renderCard();
    fireEvent.click(screen.getByRole('switch'));
    pickDay(1, 20);
    pickDay(2, 5);
    pickDay(4, 20);
    fireEvent.click(saveButton());

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { billing_reminders: { enabled: true, days: [5, 20] } } },
      expect.anything(),
    );
  });

  it('can be switched off while keeping the chosen days', () => {
    mocks.settings = { billing_reminders: { enabled: true, days: [5] } };
    signIn('community_admin');
    renderCard();
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(saveButton());

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { billing_reminders: { enabled: false, days: [5] } } },
      expect.anything(),
    );
  });

  it('will not save reminders that are on with no day picked', () => {
    signIn('community_admin');
    renderCard();
    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByText('Pick at least one day, or switch reminders off.')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('confirms the schedule once the server keeps the setting', () => {
    signIn('community_admin');
    renderCard();
    fireEvent.click(screen.getByRole('switch'));
    pickDay(1, 1);
    pickDay(2, 31);
    fireEvent.click(saveButton());

    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ settings_json: { billing_reminders: { enabled: true, days: [1, 31] } } });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Dues reminders saved',
        description: 'Reminders go out at 09:00 IST on the 1st, 31st of each month.',
      }),
    );
  });

  it('reports a server that dropped the setting instead of claiming success', () => {
    signIn('community_admin');
    renderCard();
    fireEvent.click(screen.getByRole('switch'));
    pickDay(1, 5);
    fireEvent.click(saveButton());

    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ settings_json: {} });

    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reminders not saved', variant: 'destructive' }),
    );
  });

  it('is shown to a super admin', () => {
    signIn('super_admin', true);
    renderCard();
    expect(saveButton()).toBeTruthy();
  });

  it('is hidden from roles the server would refuse', () => {
    signIn('accountant');
    const { container } = renderCard();
    expect(container.innerHTML).toBe('');
  });
});
