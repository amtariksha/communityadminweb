import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VotingContent from './voting-content';

/**
 * UNIT-08 — the poll status filter offered Draft and Cancelled, but polls are
 * always created active and the API has no draft or cancelled step, so those
 * two options could only ever show an empty list.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return { mutation, usePolls: vi.fn() };
});

vi.mock('@/hooks', () => ({
  usePolls: (status?: string) => mocks.usePolls(status),
  useActivePolls: () => ({ data: [], isLoading: false }),
  usePoll: () => ({ data: undefined, isLoading: false }),
  useCreatePoll: () => mocks.mutation(),
  useClosePoll: () => mocks.mutation(),
  useResolutions: () => ({ data: { data: [] }, isLoading: false }),
  useCreateResolution: () => mocks.mutation(),
  useProposeResolution: () => mocks.mutation(),
  useWithdrawResolution: () => mocks.mutation(),
  useElections: () => ({ data: { data: [] }, isLoading: false }),
  useCreateElection: () => mocks.mutation(),
  useCloseElection: () => mocks.mutation(),
  useRecordMinutes: () => mocks.mutation(),
  useRecordPollMinutes: () => mocks.mutation(),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

describe('VotingContent poll status filter', () => {
  it('offers only the statuses a poll can have: Active and Closed', () => {
    mocks.usePolls.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    render(<VotingContent />);

    const hidden = Array.from(document.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => option.textContent === 'All Statuses'),
    ) as HTMLSelectElement;
    const labels = Array.from(hidden.options).map((option) => option.textContent);

    expect(labels).toEqual(['All Statuses', 'Active', 'Closed']);
    expect(screen.queryByText('Draft')).toBeNull();
    expect(screen.queryByText('Cancelled')).toBeNull();
  });
});
