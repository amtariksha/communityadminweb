import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TicketComment } from '@/hooks';
import { TicketDetailThreads } from './ticket-detail-threads';

/**
 * The detail view used to drop the comment thread and send every admin
 * comment to the resident. It now shows the two conversations apart:
 * "Resident Communication" (public) and "Admin Internal Communication",
 * each with its own note box and Comment button.
 */

function comment(
  id: string,
  message: string,
  isInternal: boolean,
  createdAt: string,
): TicketComment {
  return {
    id,
    ticket_id: 'ticket-1',
    author_id: 'user-1',
    author_name: 'Test Admin',
    message,
    is_internal: isInternal,
    created_at: createdAt,
  };
}

const COMMENTS: TicketComment[] = [
  comment('c1', 'Plumber booked for Tuesday', false, '2026-10-01T09:00:00Z'),
  comment('c2', 'Unit is vacant, use the spare key', true, '2026-10-01T10:00:00Z'),
  comment('c3', 'Thank you', false, '2026-10-02T09:00:00Z'),
];

function renderThreads(
  overrides: Partial<React.ComponentProps<typeof TicketDetailThreads>> = {},
) {
  const onPost = vi.fn().mockResolvedValue(undefined);
  render(
    <TicketDetailThreads
      comments={COMMENTS}
      templates={[]}
      isPosting={false}
      onPost={onPost}
      {...overrides}
    />,
  );
  return { onPost };
}

const residentThread = () =>
  screen.getByRole('region', { name: 'Resident Communication' });
const internalThread = () =>
  screen.getByRole('region', { name: 'Admin Internal Communication' });

describe('TicketDetailThreads', () => {
  it('lists public comments under Resident Communication and notes under Admin Internal Communication', () => {
    renderThreads();

    expect(within(residentThread()).getByText('Plumber booked for Tuesday')).toBeTruthy();
    expect(within(residentThread()).getByText('Thank you')).toBeTruthy();
    expect(within(residentThread()).queryByText(/spare key/)).toBeNull();

    expect(within(internalThread()).getByText(/spare key/)).toBeTruthy();
    expect(within(internalThread()).queryByText('Thank you')).toBeNull();
  });

  it('shows who wrote each comment', () => {
    renderThreads();

    expect(within(internalThread()).getByText('Test Admin')).toBeTruthy();
  });

  it('posts a note from the internal box with is_internal true', () => {
    const { onPost } = renderThreads();

    fireEvent.change(within(internalThread()).getByPlaceholderText(/internal note/i), {
      target: { value: '  Check the stopcock  ' },
    });
    fireEvent.click(within(internalThread()).getByRole('button', { name: 'Comment' }));

    expect(onPost).toHaveBeenCalledWith('Check the stopcock', true);
  });

  it('posts a reply from the resident box with is_internal false', () => {
    const { onPost } = renderThreads();

    fireEvent.change(within(residentThread()).getByPlaceholderText(/reply to the resident/i), {
      target: { value: 'We are on it' },
    });
    fireEvent.click(within(residentThread()).getByRole('button', { name: 'Comment' }));

    expect(onPost).toHaveBeenCalledWith('We are on it', false);
  });

  it('does not post an empty note', () => {
    const { onPost } = renderThreads();

    const button = within(internalThread()).getByRole('button', { name: 'Comment' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);

    expect(onPost).not.toHaveBeenCalled();
  });

  it('lists oldest first, and newest first when asked, one thread at a time', () => {
    renderThreads();

    const order = (thread: HTMLElement) =>
      within(thread)
        .getAllByTestId('thread-comment')
        .map((node) => node.textContent ?? '');

    expect(order(residentThread())[0]).toContain('Plumber booked');
    expect(order(residentThread())[1]).toContain('Thank you');

    fireEvent.change(within(residentThread()).getByLabelText('Sort Resident Communication'), {
      target: { value: 'newest' },
    });

    expect(order(residentThread())[0]).toContain('Thank you');
    expect(within(internalThread()).getByLabelText('Sort Admin Internal Communication')).toHaveProperty(
      'value',
      'oldest',
    );
  });

  it('offers canned responses on the resident box only', () => {
    renderThreads({
      templates: [{ id: 't1', title: 'Visit booked', body: 'A technician will visit.' }],
    });

    expect(within(residentThread()).getByText('Choose canned response...')).toBeTruthy();
    expect(within(internalThread()).queryByText('Choose canned response...')).toBeNull();
  });

  it('says so when a thread is empty', () => {
    renderThreads({ comments: [] });

    expect(within(residentThread()).getByText('No messages yet.')).toBeTruthy();
    expect(within(internalThread()).getByText('No notes yet.')).toBeTruthy();
  });

  it('names a system comment "System"', () => {
    renderThreads({
      comments: [
        { ...comment('s1', 'Escalated to Level 2', true, '2026-10-03T09:00:00Z'), author_name: undefined, is_system: true },
      ],
    });

    expect(within(internalThread()).getByText('System')).toBeTruthy();
  });
});
