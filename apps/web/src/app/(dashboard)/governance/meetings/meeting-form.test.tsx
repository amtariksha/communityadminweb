import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeetingItem } from '@/hooks';
import { MeetingForm } from './meeting-form';
import { MeetingMinutesForm } from './meeting-minutes-form';

/**
 * Meeting form and minutes (PROJ-11): the same fields and rules as the
 * standard dialog and as the classic page; Save and Close Meeting closes
 * the meeting, Save Minutes keeps it open.
 */

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), addToast: vi.fn() }));
vi.mock('@/hooks', () => ({
  useCreateMeeting: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateMeeting: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const MEETING: MeetingItem = {
  id: 'm-1',
  tenant_id: 't-1',
  title: 'October committee meeting',
  meeting_date: '2026-10-25',
  start_time: '19:00:00',
  end_time: '20:30:00',
  location: 'Clubhouse',
  agenda: 'Accounts',
  minutes: null,
  status: 'scheduled',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  created_by: 'u-1',
};

describe.each(['dialog', 'page'] as const)('MeetingForm as a %s', (mode) => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ ...MEETING, id: 'm-2' });
    mocks.update.mockReset().mockResolvedValue(MEETING);
    mocks.addToast.mockClear();
  });

  const save = () =>
    fireEvent.click(screen.getByRole('button', { name: mode === 'page' ? 'Create Meeting' : 'Schedule Meeting' }));

  it('refuses a meeting that ends before it starts', () => {
    render(<MeetingForm mode={mode} open onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Meeting Title *'), { target: { value: 'Budget review' } });
    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '18:00' } });
    save();

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'The meeting must end after it starts.' }));
  });

  it('creates the meeting with the typed fields', async () => {
    const onSaved = vi.fn();
    render(<MeetingForm mode={mode} open onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Meeting Title *'), { target: { value: ' Budget review ' } });
    fireEvent.change(screen.getByLabelText('Meeting Date *'), { target: { value: '2026-11-02' } });
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Budget review', meeting_date: '2026-11-02', start_time: '19:00', status: 'scheduled' }),
    );
  });

  it('opens an existing meeting with its times as HH:MM and saves changes', async () => {
    render(<MeetingForm mode={mode} open meeting={MEETING} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Start Time *') as HTMLInputElement).value).toBe('19:00');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ id: 'm-1', data: expect.objectContaining({ end_time: '20:30' }) }));
  });
});

describe('MeetingMinutesForm', () => {
  beforeEach(() => mocks.update.mockReset().mockResolvedValue(MEETING));

  it('Save and Close Meeting saves the minutes and closes the meeting', async () => {
    const onSaved = vi.fn();
    render(<MeetingMinutesForm mode="page" meeting={MEETING} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Official Decisions & Minutes'), { target: { value: 'Approved the budget' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and Close Meeting' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    expect(mocks.update).toHaveBeenCalledWith({ id: 'm-1', data: { minutes: 'Approved the budget', status: 'completed' } });
  });

  it('Save Minutes keeps the meeting open', async () => {
    const onSaved = vi.fn();
    render(<MeetingMinutesForm mode="dialog" open meeting={MEETING} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Official Decisions & Minutes'), { target: { value: 'Draft notes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Minutes' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(false));
    expect(mocks.update).toHaveBeenCalledWith({ id: 'm-1', data: { minutes: 'Draft notes' } });
  });
});
