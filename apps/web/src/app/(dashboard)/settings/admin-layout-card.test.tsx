import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayoutCard } from './admin-layout-card';
import { layoutStorageKey } from '@/lib/admin-layout';

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
      <AdminLayoutCard />
    </QueryClientProvider>,
  );
}

function chooseClassicAndSave(): void {
  fireEvent.click(screen.getByLabelText(/Classic/));
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
}

beforeEach(() => {
  mocks.settings = {};
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('AdminLayoutCard', () => {
  it('saves the chosen layout through the society settings', () => {
    signIn('community_admin');
    renderCard();
    chooseClassicAndSave();

    expect(mocks.mutate).toHaveBeenCalledWith(
      { tenant_id: TENANT, settings: { admin_layout: 'classic' } },
      expect.anything(),
    );
  });

  it('remembers the layout and says when it applies once the server keeps it', () => {
    signIn('community_admin');
    renderCard();
    chooseClassicAndSave();

    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ settings_json: { admin_layout: 'classic' } });

    expect(localStorage.getItem(layoutStorageKey(TENANT))).toBe('classic');
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Applies to everyone in this society on their next page load.',
      }),
    );
  });

  it('reports a server that dropped the setting instead of claiming success', () => {
    signIn('community_admin');
    renderCard();
    chooseClassicAndSave();

    const { onSuccess } = mocks.mutate.mock.calls[0][1];
    onSuccess({ settings_json: {} });

    expect(localStorage.getItem(layoutStorageKey(TENANT))).toBeNull();
    expect(mocks.addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Layout not saved', variant: 'destructive' }),
    );
  });

  it('starts on the saved layout and only enables Save after a change', () => {
    mocks.settings = { admin_layout: 'classic' };
    signIn('community_admin');
    renderCard();

    expect((screen.getByLabelText(/Classic/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('button', { name: 'Save layout' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('is shown to a super admin', () => {
    signIn('super_admin', true);
    renderCard();
    expect(screen.getByRole('button', { name: 'Save layout' })).toBeTruthy();
  });

  it('is hidden from roles the server would refuse', () => {
    signIn('accountant');
    const { container } = renderCard();
    expect(container.innerHTML).toBe('');
  });
});
