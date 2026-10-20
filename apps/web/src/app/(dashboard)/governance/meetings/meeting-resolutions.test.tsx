import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkResolutions, resolutionText } from './meeting-resolutions';

/** Link resolution on the minutes page (PROJ-48): linked ones with Unlink, the free ones to pick. */

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/use-governance', () => ({
  useResolutions: () => ({
    data: {
      data: [
        { id: 'r-1', resolution_number: 'RES-0001', title: 'Approve the lift fund', status: 'passed', meeting_id: 'm-1' },
        { id: 'r-2', resolution_number: 'RES-0002', title: 'Adopt the parking policy', status: 'draft', meeting_id: null },
        { id: 'r-3', resolution_number: 'RES-0003', title: 'Other meeting', status: 'draft', meeting_id: 'm-9' },
      ],
      total: 3,
    },
  }),
}));
vi.mock('@/hooks/use-meeting-invites', () => ({ useLinkResolution: () => ({ mutate: mocks.mutate, isPending: false }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const LINKED = [{ id: 'r-1', resolution_number: 'RES-0001', title: 'Approve the lift fund', resolution_type: 'special', meeting_type: 'egm', status: 'passed' }];

describe('LinkResolutions', () => {
  beforeEach(() => mocks.mutate.mockClear());

  it('lists the linked resolution and offers only the ones not linked to a meeting', () => {
    render(<LinkResolutions meetingId="m-1" linked={LINKED} />);

    expect(screen.getByText(resolutionText(LINKED[0]))).toBeTruthy();
    const options = [...(screen.getByLabelText('Link resolution') as HTMLSelectElement).options].map((option) => option.value);
    expect(options).toEqual(['', 'r-2']);
  });

  it('links the picked resolution and unlinks a linked one', () => {
    render(<LinkResolutions meetingId="m-1" linked={LINKED} />);

    fireEvent.change(screen.getByLabelText('Link resolution'), { target: { value: 'r-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ meetingId: 'm-1', resolutionId: 'r-2', link: true }, expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({ meetingId: 'm-1', resolutionId: 'r-1', link: false }, expect.anything());
  });

  it('shows nothing on an API that does not link resolutions', () => {
    const { container } = render(<LinkResolutions meetingId="m-1" linked={undefined} />);
    expect(container.textContent).toBe('');
  });
});
