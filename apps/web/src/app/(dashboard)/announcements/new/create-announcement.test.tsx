import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

/** ANN-10 / ANN-11 — Create Announcement as a page: Preview · Post, no channel choice, Classification required. */

const calls = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), search: '' as string | undefined }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: calls.push }),
  useSearchParams: () => new URLSearchParams(calls.search ?? ''),
}));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    ...actual,
    useAnnouncementChannels: () => ({ data: { default_channels: ['push'] } }),
    useNotificationChannels: () => ({ data: { email: true, sms: false, sms_essential: false, sms_message_max: 120 } }),
    useUnitBlocks: () => ({ data: { data: [] } }),
    useBlocks: () => ({ data: [] }),
    useUploadFileToS3: mutation,
    useCreateAnnouncement: () => ({ mutateAsync: calls.create.mockResolvedValue({ data: { state: 'active' } }), isPending: false }),
    useUpdateAnnouncement: mutation,
    usePublishAnnouncement: mutation,
  };
});

beforeEach(() => {
  calls.create.mockClear();
  calls.search = '';
});

describe('Create Announcement (classic page)', () => {
  it('has Preview and Post, and no Send by choice (the Setup defaults apply)', () => {
    render(<Page />);

    expect(screen.getByRole('button', { name: 'Post' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeTruthy();
    expect(screen.queryByText('Send by')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save as Draft' })).toBeNull();
    expect(screen.getByLabelText('All Owners of Block …')).toBeTruthy();
  });

  it('needs a Classification, then posts without channels', async () => {
    render(<Page />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'AGM' } });
    fireEvent.change(screen.getByLabelText('Brief Description'), { target: { value: 'On Sunday at 10.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    expect(screen.getByText('Choose Official or Promotional.')).toBeTruthy();
    expect(calls.create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Official'));
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await vi.waitFor(() => expect(calls.create).toHaveBeenCalledTimes(1));

    const sent = calls.create.mock.calls[0][0];
    expect(sent).toMatchObject({ title: 'AGM', classification: 'official', publish_now: true, target_audience: 'all' });
    expect(sent).not.toHaveProperty('channels');
  });

  it('opens with a known starter draft, never text from the link (GATE-44 Inform Residents)', () => {
    calls.search = 'draft=gate-preapprove';
    const { unmount } = render(<Page />);
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Pre-approve your visitors');
    unmount();

    calls.search = 'draft=<b>anything</b>';
    render(<Page />);
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('');
  });

  it('previews without saving', () => {
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('article', { name: 'Resident view' })).toBeTruthy();
    expect(calls.create).not.toHaveBeenCalled();
  });
});
