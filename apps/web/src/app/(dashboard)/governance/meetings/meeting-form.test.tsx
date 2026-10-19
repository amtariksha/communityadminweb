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
vi.mock('@/hooks/use-meetings', () => ({ useNextMeetingNumbers: () => ({ data: { meeting_no: 12, task_no: 40 } }) }));

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
    fireEvent.change(screen.getByLabelText('Agenda 1 *'), { target: { value: 'Budget' } });
    fireEvent.change(screen.getByLabelText('Duration *'), { target: { value: 'custom' } });
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
    fireEvent.change(screen.getByLabelText('Agenda 1 *'), { target: { value: 'Budget' } });
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Budget review', meeting_date: '2026-11-02', start_time: '19:00', status: 'scheduled' }),
    );
  });

  it('sends the duration, its end time, the notes and the agenda lines in order (PROJ-23)', async () => {
    render(<MeetingForm mode={mode} open onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Meeting Title *'), { target: { value: 'Lift AMC' } });
    fireEvent.change(screen.getByLabelText('Start Time *'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Duration *'), { target: { value: '120' } });
    expect(screen.getByText('Ends at 12:00')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Bring the quotes' } });
    fireEvent.change(screen.getByLabelText('Agenda 1 *'), { target: { value: 'Quotes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add More agenda' }));
    fireEvent.change(screen.getByLabelText('Agenda 2'), { target: { value: 'Vendor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add More agenda' }));
    fireEvent.change(screen.getByLabelText('Agenda 3'), { target: { value: 'Decision' } });
    save();

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '10:00',
        end_time: '12:00',
        duration_minutes: 120,
        notes: 'Bring the quotes',
        agenda_items: ['Quotes', 'Vendor', 'Decision'],
        agenda: 'Quotes\nVendor\nDecision',
      }),
    );
  });

  it('asks for at least one agenda line', () => {
    render(<MeetingForm mode={mode} open onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Meeting Title *'), { target: { value: 'Budget review' } });
    save();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Write at least one agenda line.' }));
  });

  it('opens an existing meeting with its times as HH:MM and saves changes', async () => {
    render(<MeetingForm mode={mode} open meeting={MEETING} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Start Time *') as HTMLInputElement).value).toBe('19:00');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ id: 'm-1', data: expect.objectContaining({ end_time: '20:30' }) }));
  });
});

describe('MeetingForm headings (PROJ-20)', () => {
  it('shows the next Meet.ID on the create page and the meeting\'s own on edit', () => {
    const { unmount } = render(<MeetingForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Create a Meeting — Meet.ID 12')).toBeTruthy();
    unmount();
    render(<MeetingForm mode="page" meeting={{ ...MEETING, meeting_no: 7 }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Edit Meeting — Meet.ID 7')).toBeTruthy();
  });

  it('reads an older meeting\'s agenda text as line 1 and its odd length as its own end time', () => {
    render(<MeetingForm mode="page" meeting={MEETING} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Agenda 1 *') as HTMLInputElement).value).toBe('Accounts');
    expect((screen.getByLabelText('Duration *') as HTMLSelectElement).value).toBe('custom');
    expect((screen.getByLabelText('End Time *') as HTMLInputElement).value).toBe('20:30');
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
