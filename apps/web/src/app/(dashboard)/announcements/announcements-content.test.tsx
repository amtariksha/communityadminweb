import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnouncementsContent, { exportRows } from './announcements-content';
import type { Announcement } from '@/hooks';
import { dateIST } from '@/lib/date';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  counts: undefined as Record<string, number> | undefined,
  calls: [] as Array<Record<string, unknown> | undefined>,
  retire: vi.fn(),
  remove: vi.fn(),
  sms: false,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/announcements',
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    ...actual,
    useAnnouncements: (filters: Record<string, unknown>) => {
      state.calls.push(filters);
      return { data: { data: state.rows, total: state.rows.length, counts: state.counts }, isLoading: false };
    },
    useAnnouncement: () => ({ data: undefined }),
    useAnnouncementDelivery: () => ({ data: null }),
    useAnnouncementChannels: () => ({ data: { default_channels: ['push', 'email'] } }),
    useNotificationChannels: () => ({ data: { email: true, sms: state.sms, sms_essential: false, sms_message_max: 120 } }),
    useUnitBlocks: () => ({ data: { data: [{ id: 'b1', name: 'A' }, { id: 'b2', name: 'B' }] } }),
    useBlocks: () => ({ data: [] }),
    useUploadFileToS3: mutation,
    useCreateAnnouncement: mutation,
    useUpdateAnnouncement: mutation,
    usePublishAnnouncement: mutation,
    useApproveAnnouncement: mutation,
    useRejectAnnouncement: mutation,
    useDeleteAnnouncement: () => ({ mutate: state.remove, isPending: false }),
    useRetireAnnouncement: () => ({ mutate: state.retire, isPending: false }),
  };
});

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const NOTICE = {
  id: 'n1', tenant_id: 't', title: 'Lift shut on Sunday', body: 'Block A lift', category: 'maintenance',
  priority: 'normal', target_audience: 'owners', target_blocks: ['A'], attachment_url: null, is_pinned: false,
  published_at: '2026-10-01T05:00:00Z', expires_at: null, created_by: 'u', created_at: '2026-10-01T05:00:00Z',
  updated_at: '2026-10-01T05:00:00Z', status: 'active', state: 'active', classification: 'official',
};

beforeEach(() => {
  nav.search = '';
  nav.replace.mockClear();
  state.rows = [];
  state.counts = undefined;
  state.calls = [];
  state.retire.mockClear();
  state.remove.mockClear();
  state.sms = false;
});

describe('AnnouncementsContent — ?new=1', () => {
  it('opens the New Announcement dialog and drops the parameter from the URL', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    expect(screen.getByRole('heading', { name: 'New Announcement' })).toBeTruthy();
    expect(nav.replace).toHaveBeenCalledWith('/announcements');
  });

  it('stays closed without the parameter', () => {
    render(<AnnouncementsContent />);

    expect(screen.queryByRole('heading', { name: 'New Announcement' })).toBeNull();
  });
});

describe('AnnouncementsContent — ANN-01', () => {
  it('offers no "Security" category, in the filter or the form, and offers Staff', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    for (const id of ['announcement-category', 'form-category']) {
      expect(within(document.getElementById(id) as HTMLSelectElement).queryByText('Security')).toBeNull();
    }
    expect(within(document.getElementById('form-audience') as HTMLSelectElement).getByText('Staff')).toBeTruthy();
  });

  it('says the notice expires at the end of the chosen day', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    expect(screen.getByText('Expires at the end of this day')).toBeTruthy();
  });

  it('exports the Status the table shows, from the state or the old way', () => {
    const base = { title: 'Notice', expires_at: null, target_audience: 'all', target_blocks: null, category: 'general' } as unknown as Announcement;
    const rows = exportRows([
      { ...base, id: 'a', published_at: '2026-10-01T05:00:00Z' },
      { ...base, id: 'b', published_at: null },
      { ...base, id: 'c', published_at: '2026-01-01T05:00:00Z', expires_at: '2026-02-01T18:29:59Z' },
      { ...base, id: 'd', published_at: null, state: 'awaiting_approval' },
    ]);

    expect(rows.map((r) => r.status)).toEqual(['Active', 'Draft', 'Retired', 'Awaiting Approval']);
  });

  it('shows a stored expiry back as its India date', () => {
    expect(dateIST('2026-10-20T18:29:59.000Z')).toBe('2026-10-20');
  });
});

describe('AnnouncementsContent — states (ANN-03)', () => {
  it('shows Drafts · Awaiting Approval · Active · Retired once the server counts them, and asks for the tab', () => {
    state.counts = { draft: 2, awaiting_approval: 1, active: 5, retired: 9 };
    render(<AnnouncementsContent />);

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual(['Drafts (2)', 'Awaiting Approval (1)', 'Active (5)', 'Retired (9)']);
    fireEvent.click(screen.getByRole('tab', { name: 'Retired (9)' }));
    expect(state.calls.at(-1)).toMatchObject({ state: 'retired' });
  });

  it('shows no tabs on a server that does not count states', () => {
    render(<AnnouncementsContent />);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('retires an active notice after the confirmation, instead of deleting it', () => {
    state.counts = { draft: 0, awaiting_approval: 0, active: 1, retired: 0 };
    state.rows = [NOTICE];
    render(<AnnouncementsContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Lift shut on Sunday' }));
    fireEvent.click(screen.getByText('Retire'));
    expect(screen.getByText(/This moves the notice to Retired/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(state.retire).toHaveBeenCalledWith({ id: 'n1', reason: undefined }, expect.anything());
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('shows the recipients with their blocks', () => {
    state.rows = [NOTICE];
    render(<AnnouncementsContent />);

    expect(screen.getByText('All Owners of Block A')).toBeTruthy();
  });
});

describe('Create form — recipients, channels and fields (ANN-05 / ANN-07 / ANN-11)', () => {
  it('asks for a block when an "of Block" choice is made', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    fireEvent.change(document.getElementById('form-audience') as HTMLSelectElement, { target: { value: 'owners_of_blocks' } });
    expect(screen.getByLabelText('A')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    expect(screen.getByText('Choose at least one block.')).toBeTruthy();
  });

  it('prefills Send by from the defaults, needs Reply To for email, and disables SMS when it is not set up', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    expect((screen.getByLabelText('Email') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('General SMS') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('SMS is not set up.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(screen.getByText('Give the email address replies should go to.')).toBeTruthy();
    expect(screen.getByText('Choose Official or Promotional.')).toBeTruthy();
  });

  it('previews the notice as a resident sees it, without saving', () => {
    nav.search = 'new=1';
    render(<AnnouncementsContent />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Holi party' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(within(screen.getByRole('article', { name: 'Resident view' })).getByText('Holi party')).toBeTruthy();
  });
});
