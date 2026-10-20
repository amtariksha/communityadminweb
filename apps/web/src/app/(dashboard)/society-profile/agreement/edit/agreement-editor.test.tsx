import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgreementVersion } from '@/hooks/use-society-agreement';
import { AgreementEditor } from './agreement-editor';

/** Read/Edit Default Agreement (PROF-S5): Save draft, and Publish after asking. */
const mocks = vi.hoisted(() => ({ save: vi.fn(), publish: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-society-agreement', () => ({
  useSaveAgreementDraft: () => ({ mutateAsync: mocks.save, isPending: false }),
  usePublishAgreement: () => ({ mutateAsync: mocks.publish, isPending: false }),
}));

const draft: AgreementVersion = {
  id: 'd2',
  version: 2,
  body_html: '<p>Draft two</p>',
  status: 'draft',
  published_at: null,
  created_at: '2026-10-20T09:00:00.000Z',
  updated_at: '2026-10-20T09:30:00.000Z',
};
const published: AgreementVersion = { ...draft, id: 'p1', version: 1, status: 'published', published_at: '2026-10-01T00:00:00Z' };

function type(html: string): void {
  const box = screen.getByRole('textbox', { name: 'User Agreement' });
  box.innerHTML = html;
  fireEvent.input(box);
}

describe('AgreementEditor', () => {
  beforeEach(() => {
    mocks.save.mockReset().mockResolvedValue({ ...draft, id: 'd3', version: 3, updated_at: '2026-10-20T10:00:05.000Z' });
    mocks.publish.mockReset().mockResolvedValue({ ...draft, status: 'published' });
  });

  it('never puts a script or handler from the stored text into the editor', () => {
    render(<AgreementEditor editable={{ ...draft, body_html: '<p onclick="x()">Rules<script>steal()</script></p>' }} canEdit />);
    expect(screen.getByRole('textbox', { name: 'User Agreement' }).innerHTML).toBe('<p>Rules</p>');
  });

  it('saves the edited text as a draft', async () => {
    render(<AgreementEditor editable={draft} canEdit />);
    type('<p>Be <b>kind</b></p>');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('<p>Be <strong>kind</strong></p>'));
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('publishes the open draft only after the residents-will-be-asked question', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<AgreementEditor editable={draft} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Residents will be asked to accept again'));
    expect(mocks.publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith({ id: 'd2', updated_at: draft.updated_at }));
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('saves a change to a published version as the next draft, then publishes that', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AgreementEditor editable={published} canEdit />);
    expect(screen.getByTestId('agreement-status').textContent).toContain('Saving starts version 2');
    expect((screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true);
    type('<p>New rules</p>');
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith({ id: 'd3', updated_at: '2026-10-20T10:00:05.000Z' }));
    expect(mocks.save).toHaveBeenCalledWith('<p>New rules</p>');
  });

  it('is read-only for roles that cannot write it', () => {
    render(<AgreementEditor editable={draft} canEdit={false} />);
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });
});
