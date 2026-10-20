import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DraftProposal } from './draft-proposal';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { data: undefined as unknown, isPending: false, isError: false, error: null as unknown },
}));

vi.mock('@/hooks/use-announcements', () => ({
  useCreateAnnouncement: () => ({ mutate: mocks.mutate, ...mocks.state }),
}));

const card = { type: 'announcement_draft' as const, title: 'Water shutdown', body: 'Water off on Sunday 10 to 2.', category: 'maintenance' };

afterEach(() => {
  vi.clearAllMocks();
  mocks.state = { data: undefined, isPending: false, isError: false, error: null };
});

describe('DraftProposal', () => {
  it('saves nothing until the person presses Save as draft, and then only a draft', () => {
    render(<DraftProposal card={card} />);
    expect(mocks.mutate).not.toHaveBeenCalled();
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Save as draft' })));
    expect(mocks.mutate).toHaveBeenCalledWith({ title: 'Water shutdown', body: 'Water off on Sunday 10 to 2.', category: 'maintenance', classification: 'official' });
    expect(mocks.mutate.mock.calls[0][0]).not.toHaveProperty('publish_now');
  });

  it('links to the saved draft', () => {
    mocks.state = { ...mocks.state, data: { data: { id: 'a1b2', title: 'Water shutdown' } } };
    render(<DraftProposal card={card} />);
    expect(screen.getByRole('link', { name: 'Open the draft' }).getAttribute('href')).toBe('/announcements/a1b2');
    expect(screen.queryByRole('button', { name: 'Save as draft' })).toBeNull();
  });
});
