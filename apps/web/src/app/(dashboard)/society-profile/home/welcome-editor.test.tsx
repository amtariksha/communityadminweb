import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WELCOME, WelcomeEditor } from './welcome-editor';

/** Society Profile › Home (PROF-21): the committee's welcome message, saved as the editor holds it. */
const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/use-society-profile', () => ({ useUpdateSocietyProfile: () => ({ mutate: mocks.mutate, isPending: false }) }));

function type(html: string): void {
  const box = screen.getByRole('textbox', { name: 'Welcome Message' });
  box.innerHTML = html;
  fireEvent.input(box);
}

describe('WelcomeEditor', () => {
  beforeEach(() => mocks.mutate.mockReset());

  it('opens on the saved message, or our greeting when none is saved', () => {
    const { unmount } = render(<WelcomeEditor savedHtml="<p>Hello neighbours</p>" canEdit />);
    expect(screen.getByRole('textbox', { name: 'Welcome Message' }).innerHTML).toBe('<p>Hello neighbours</p>');
    unmount();
    render(<WelcomeEditor savedHtml={null} canEdit />);
    expect(screen.getByRole('textbox', { name: 'Welcome Message' }).innerHTML).toBe(DEFAULT_WELCOME);
  });

  it('saves what the editor holds, in the API’s words', () => {
    render(<WelcomeEditor savedHtml={null} canEdit />);
    type('<div><b>Pool</b> opens at 6</div>');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ welcome_message_html: '<p><strong>Pool</strong> opens at 6</p>' }, expect.anything());
  });

  it('clears the message when the editor is emptied', () => {
    render(<WelcomeEditor savedHtml="<p>Old</p>" canEdit />);
    type('<p><br></p>');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ welcome_message_html: null }, expect.anything());
  });

  it('offers the toolbar of PROF-S1, and nothing to roles that cannot write', () => {
    const { unmount } = render(<WelcomeEditor savedHtml={null} canEdit />);
    for (const name of ['Numbered list', 'Bullet list', 'Subscript', 'Superscript', 'Link', 'Picture']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    unmount();
    render(<WelcomeEditor savedHtml={null} canEdit={false} />);
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
