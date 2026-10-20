import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsContent from './notifications-content';

/** ANN-08 — Broadcast with their recipients, block, the SMS channels, a length check and a counted confirm. */

const state = vi.hoisted(() => ({
  sms: false,
  max: 120,
  count: 3 as number | null,
  layout: 'standard',
  role: 'community_admin',
  create: vi.fn(),
  send: vi.fn(),
}));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => state.layout }));
vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  getUser: () => ({ id: 'u1', isSuperAdmin: false, role: state.role, societies: [{ id: 't1', role: state.role }] }),
  getCurrentTenant: () => 't1',
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return {
    ...actual,
    useNotificationTemplates: () => ({ data: { data: [] }, isLoading: false }),
    useSentNotifications: () => ({ data: { data: [] }, isLoading: false }),
    useCreateTemplate: () => ({ mutateAsync: state.create.mockResolvedValue({ data: { id: 'tpl-1' } }), isPending: false }),
    useSendTemplate: () => ({ mutate: state.send, isPending: false }),
    useTestSendTemplate: () => ({ mutate: vi.fn(), isPending: false }),
    useNotificationChannels: () => ({ data: { email: true, sms: state.sms, sms_essential: state.sms, sms_message_max: state.max } }),
    useAudienceCount: () => ({ data: state.count, isLoading: false }),
    useUnitBlocks: () => ({ data: { data: [{ id: 'b1', name: 'A' }] } }),
    useBlocks: () => ({ data: [] }),
  };
});

const channel = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

beforeEach(() => {
  state.sms = false;
  state.count = 3;
  state.layout = 'standard';
  state.role = 'community_admin';
  state.create.mockClear();
  state.send.mockClear();
  window.history.replaceState(null, '', '/notifications');
});

describe('Broadcast composer', () => {
  it('disables both SMS options while SMS is not set up', () => {
    render(<NotificationsContent />);

    expect(channel('In-app + General SMS').disabled).toBe(true);
    expect(channel('In-app + Essential SMS').disabled).toBe(true);
    expect(screen.getByText('SMS is not set up.')).toBeTruthy();
  });

  it('offers their four channels in classic, and no Essential SMS to a committee member', () => {
    state.layout = 'classic';
    state.role = 'committee_member';
    render(<NotificationsContent />);

    expect(screen.getByRole('heading', { name: 'Broadcast message' })).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('General SMS')).toBeTruthy();
    expect(screen.getByLabelText('App Notification')).toBeTruthy();
    expect(screen.queryByLabelText('Essential SMS')).toBeNull();
  });

  it('refuses a 200-character SMS when the limit is 120', () => {
    state.sms = true;
    render(<NotificationsContent />);

    fireEvent.click(channel('In-app + General SMS'));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x'.repeat(200) } });

    expect(screen.getByText(/200 \/ 120 characters — too long for an SMS/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Send Notification/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens with the channel from ?compose=1&channel=', () => {
    state.sms = true;
    window.history.replaceState(null, '', '/notifications?compose=1&channel=sms_general');
    render(<NotificationsContent />);

    expect(channel('In-app + General SMS').checked).toBe(true);
  });

  it('confirms with the recipient count, then sends "All Owners of Block A"', async () => {
    render(<NotificationsContent />);

    fireEvent.click(screen.getByLabelText('All Owners of Block …'));
    fireEvent.change(screen.getByLabelText('Block'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Lift' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Lift off on Sunday.' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Notification/ }));
    expect(screen.getByText('It goes to 3 people.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await vi.waitFor(() => expect(state.send).toHaveBeenCalledWith('tpl-1', expect.anything()));
    expect(state.create.mock.calls[0][0]).toMatchObject({ target_audience: 'owners', target_blocks: ['A'] });
  });

  it('marks a third-party deal or offer as promotional, and sends nothing extra when unticked (UNIT-37)', async () => {
    render(<NotificationsContent />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Bakery offer' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Ten percent off.' } });
    fireEvent.click(screen.getByLabelText(/Third-party deal or offer/));
    fireEvent.click(screen.getByRole('button', { name: /Send Notification/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create.mock.calls[0][0]).toMatchObject({ is_promotional: true });

    fireEvent.click(screen.getByLabelText(/Third-party deal or offer/));
    fireEvent.click(screen.getByRole('button', { name: /Send Notification/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await vi.waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
    expect(state.create.mock.calls[1][0]).not.toHaveProperty('is_promotional');
  });

  it('will not send when no one matches', () => {
    state.count = 0;
    render(<NotificationsContent />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Lift' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Lift off.' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Notification/ }));

    expect(screen.getByText('No one matches these recipients.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
