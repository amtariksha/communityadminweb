import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventForm } from './event-form';

/**
 * Add / Edit Event (AMEN-12, screen AMEN-S4): one form for the /events
 * dialog and the classic page, with today's fields and the cover image.
 */

const state = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: state.toast }) }));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <input aria-label="Ticket Income Account" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('@/hooks', () => ({
  useAmenities: () => ({ data: { data: [{ id: 'am-1', name: 'Party Hall', is_active: true }, { id: 'am-2', name: 'Old Gym', is_active: false }] } }),
  useCreateEvent: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateEvent: () => ({ mutateAsync: state.update, isPending: false }),
  useUploadFileToS3: () => ({ mutateAsync: state.upload, isPending: false }),
}));

const EVENT = {
  id: 'ev-1', tenant_id: 't', title: 'Diwali Mela', description: null, event_date: '2030-11-01', start_time: '18:30:00',
  end_time: '21:00:00', location: 'Clubhouse lawn', max_attendees: 200, rsvp_deadline: null, cover_image_url: null,
  target_audience: 'all' as const, status: 'published' as const, created_at: '', updated_at: '', created_by: null,
};

describe('EventForm', () => {
  beforeEach(() => {
    state.create.mockReset().mockResolvedValue({});
    state.update.mockReset().mockResolvedValue({});
    state.upload.mockReset().mockResolvedValue({ fileUrl: 'https://files.example/cover.png', key: 'k' });
    state.toast.mockReset();
  });

  it('adds an event from the page with the cover image it uploaded (previewed from the picked file)', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:picked-cover');
    URL.revokeObjectURL = vi.fn();
    const onSaved = vi.fn();
    render(<EventForm mode="page" onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Event Name *'), { target: { value: 'Holi Festival' } });
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Image'), { target: { files: [file] } });
    });
    expect(screen.getByAltText('Event cover').getAttribute('src')).toBe('blob:picked-cover');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));
    });

    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Holi Festival', cover_image_url: 'https://files.example/cover.png', target_audience: 'all', status: 'published' }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('opens an event with its values and saves its changes', async () => {
    render(<EventForm mode="page" event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect((screen.getByLabelText('Start Time *') as HTMLInputElement).value).toBe('18:30');
    fireEvent.change(screen.getByLabelText('Venue / Location'), { target: { value: 'Amphitheatre' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(state.update).toHaveBeenCalledWith({ id: 'ev-1', data: expect.objectContaining({ location: 'Amphitheatre', max_attendees: 200 }) });
  });

  it('refuses an end time before the start, and saves nothing', async () => {
    render(<EventForm mode="page" event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '17:00' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(state.update).not.toHaveBeenCalled();
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'The end time must be after the start time' }));
  });

  it('holds a Regular class in a facility from its date to its end date (AMEN-23)', async () => {
    render(<EventForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Event Name *'), { target: { value: 'Morning Yoga' } });
    fireEvent.click(screen.getByLabelText('Regular Class'));
    expect(screen.queryByRole('option', { name: 'Old Gym' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Facility'), { target: { value: 'am-1' } });
    expect(screen.queryByLabelText('Venue / Location')).toBeNull();
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2030-11-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2030-11-30' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));
    });

    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ amenity_id: 'am-1', class_type: 'regular', event_date: '2030-11-01', end_date: '2030-11-30', location: null }),
    );
  });

  it('sends a One-Time class on one date, at a venue written out', async () => {
    render(<EventForm mode="page" event={{ ...EVENT, class_type: 'one_time', end_date: null }} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.queryByLabelText('End Date')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(state.update).toHaveBeenCalledWith({
      id: 'ev-1',
      data: expect.objectContaining({ amenity_id: null, class_type: 'one_time', end_date: null, location: 'Clubhouse lawn' }),
    });
  });

  it('refuses a file that is not a picture', async () => {
    render(<EventForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Image'), { target: { files: [new File(['x'], 'notes.pdf', { type: 'application/pdf' })] } });
    });

    expect(state.upload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/picture/);
  });
});
