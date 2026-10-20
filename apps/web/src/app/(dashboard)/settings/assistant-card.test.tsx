import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantCard } from './assistant-card';

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  status: { data: undefined as unknown, isLoading: false },
  mutate: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-assistant', () => ({
  useAssistantStatus: () => mocks.status,
  useSaveAssistantSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'user-1', name: 'Test Admin', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Test Society', role }] }),
  );
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Settings › Assistant', () => {
  it('is off by default and says plainly what goes to Google Gemini', () => {
    signIn('community_admin');
    mocks.status = { data: { enabled: false, configured: true, can_change: true, limits: { per_hour: 30, per_day: 150 } }, isLoading: false };
    render(<AssistantCard />);
    expect((screen.getByLabelText(/Switch the Assistant on/) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/sent to Google Gemini/)).toBeTruthy();
  });

  it('lets the community admin switch it on', () => {
    signIn('community_admin');
    mocks.status = { data: { enabled: false, configured: true, can_change: true, limits: { per_hour: 30, per_day: 150 } }, isLoading: false };
    render(<AssistantCard />);
    fireEvent.click(screen.getByLabelText(/Switch the Assistant on/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate).toHaveBeenCalledWith(true, expect.anything());
  });

  it('is not shown to other roles', () => {
    signIn('accountant');
    const { container } = render(<AssistantCard />);
    expect(container.textContent).toBe('');
  });

  it('says not available yet while the API has no Assistant', () => {
    signIn('community_admin');
    mocks.status = { data: null, isLoading: false };
    render(<AssistantCard />);
    expect(screen.getByText('The Assistant is not available yet.')).toBeTruthy();
  });
});
