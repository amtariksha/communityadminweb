import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GovernanceContent } from './governance-content';

/**
 * `mom_tasks.assignee_id` is a foreign key to `users(id)`. The Assign
 * Task dialog used to offer the staff roster and send the picked
 * `society_staff.id`, which the database refused for every staff member.
 */

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/governance',
  useRouter: () => ({ replace: nav.replace }),
}));

const mocks = vi.hoisted(() => {
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });
  const query = (data: unknown) => () => ({ data, isLoading: false });
  return {
    // Ravi is one person with two ids: his society_staff row and his login.
    STAFF_ROW_ID: 'staff-row-1',
    RAVI_USER_ID: 'user-77',
    addToast: vi.fn(),
    createTask: mutation(),
    other: mutation(),
    query,
  };
});

vi.mock('@/hooks', () => ({
  useMeetings: mocks.query([
    {
      id: 'meeting-1',
      title: 'October MC meeting',
      meeting_date: '2026-10-20',
      start_time: '19:00',
      end_time: '20:30',
      location: null,
      agenda: null,
      minutes: null,
      status: 'scheduled',
      total_tasks: 0,
      completed_tasks: 0,
    },
  ]),
  useMomTasks: mocks.query([]),
  useStaffEmployees: mocks.query({
    data: [{ id: mocks.STAFF_ROW_ID, name: 'Ravi Kumar', staff_type: 'electrician', designation: null }],
  }),
  useCreateMomTask: () => mocks.createTask,
  useCreateMeeting: () => mocks.other,
  useUpdateMeeting: () => mocks.other,
  useDeleteMeeting: () => mocks.other,
  useUpdateMomTask: () => mocks.other,
  useDeleteMomTask: () => mocks.other,
}));

// The meeting form previews the next Meet.ID (PROJ-20); Add Task reads the categories (PROJ-21).
vi.mock('@/hooks/use-meetings', () => ({
  useNextMeetingNumbers: () => ({ data: undefined }),
  useCreateStandaloneTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-task-categories', () => ({ useTaskCategories: () => ({ data: [] }) }));

vi.mock('@/hooks/use-user-search', () => ({
  useUserSearch: (q: string) => ({
    data:
      q.trim().length >= 3
        ? [{ id: mocks.RAVI_USER_ID, phone: '+919900000001', name: 'Ravi Kumar', email: null, units: [], roles: ['security_guard'] }]
        : [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-debounced-value', () => ({
  useDebouncedValue: <T,>(value: T): T => value,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

function openAssignTask(): HTMLElement {
  render(<GovernanceContent />);
  fireEvent.click(screen.getByRole('button', { name: /assign task/i }));
  return screen
    .getByRole('heading', { name: 'Assign Action Item (MoM)' })
    .closest('dialog') as HTMLElement;
}

describe('GovernanceContent — Assign Task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns the task to a users.id picked from the society directory', async () => {
    const dialog = openAssignTask();

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Inspect hydrant valves' },
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: '2026-10-27' },
    });
    fireEvent.change(within(dialog).getByPlaceholderText(/search by phone or name/i), {
      target: { value: 'Ravi' },
    });
    // The matched part of the name is highlighted, so match the whole row.
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Ravi Kumar/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dispatch Task' }));

    await waitFor(() => expect(mocks.createTask.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.createTask.mutateAsync).toHaveBeenCalledWith({
      meetingId: 'meeting-1',
      data: {
        title: 'Inspect hydrant valves',
        description: null,
        assignee_id: mocks.RAVI_USER_ID,
        due_date: '2026-10-27',
        status: 'pending',
      },
    });
  });

  it('asks for an assignee instead of dispatching without one', async () => {
    const dialog = openAssignTask();

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Inspect hydrant valves' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dispatch Task' }));

    await waitFor(() =>
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' }),
      ),
    );
    expect(mocks.createTask.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('GovernanceContent — ?new=1 (DASH-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = '';
  });

  it('opens the Schedule Meeting dialog and drops the parameter from the URL', () => {
    nav.search = 'new=1';

    render(<GovernanceContent />);

    expect(screen.getByRole('heading', { name: 'Schedule Meeting' })).toBeTruthy();
    expect(nav.replace).toHaveBeenCalledWith('/governance');
  });

  it('stays closed without the parameter', () => {
    render(<GovernanceContent />);

    expect(screen.queryByRole('heading', { name: 'Schedule Meeting' })).toBeNull();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
