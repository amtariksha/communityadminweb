import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResidentMessagePage } from './resident-message-page';

/** UNIT-20 / UNIT-21 — the invite and welcome message pages: merge fields, the e-mail switch, defaults. */

const mocks = vi.hoisted(() => ({ data: undefined as unknown, save: vi.fn(), role: 'community_admin' }));

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/components/rich-text/rich-text-editor', () => ({
  RichTextEditor: ({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }): ReactNode => (
    <textarea aria-label="Message" defaultValue={initialHtml} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock('@/hooks/use-resident-settings', async (actual) => ({
  ...(await actual<typeof import('@/hooks/use-resident-settings')>()),
  useResidentSettings: () => ({ isLoading: false, isError: false, data: mocks.data }),
  useSaveResidentSettings: () => ({ mutate: mocks.save, isPending: false }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'community_admin';
  mocks.data = { invite_message: null, invite_email_enabled: false, approval_message: '<p>Hi {{member_name}}</p>', approval_email_enabled: false };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('ResidentMessagePage', () => {
  it('starts the invite from our default text when nothing is saved, and lists its merge fields', () => {
    render(<ResidentMessagePage kind="invite" />);

    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain('{{society_name}}');
    expect(screen.getByText('{{app_link}}')).toBeTruthy();
    expect(screen.queryByText('{{approver_name}}')).toBeNull();
  });

  it('refuses an unknown merge field before saving', () => {
    render(<ResidentMessagePage kind="approval" />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '<p>{{login_id}}</p>' } });

    expect(screen.getByText(/Unknown merge field: \{\{login_id\}\}/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves the message with the e-mail switch', () => {
    render(<ResidentMessagePage kind="approval" />);

    fireEvent.click(screen.getByLabelText(/Also e-mail it/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.save).toHaveBeenCalledWith({ approval_message: '<p>Hi {{member_name}}</p>', approval_email_enabled: true }, expect.anything());
  });

  it('an empty message goes back to the default (null) after a confirm', () => {
    render(<ResidentMessagePage kind="approval" />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '<p></p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith({ approval_message: null, approval_email_enabled: false }, expect.anything());
  });

  it('is read-only for anyone but the community admin', () => {
    mocks.role = 'committee_member';
    render(<ResidentMessagePage kind="invite" />);

    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('says it is not available on an API without it', () => {
    mocks.data = null;
    render(<ResidentMessagePage kind="invite" />);

    expect(screen.getByText('This setting is not available yet on this server.')).toBeTruthy();
  });
});
