import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksContent } from './tasks-content';

/**
 * Tasks (PROJ-12, screen PROJ-S11): the status options carry the server's
 * counts, Close Task in the first column closes the task, Reopen brings a
 * closed one back.
 */

const mocks = vi.hoisted(() => ({ list: vi.fn(), mutate: vi.fn(), categories: vi.fn() }));
vi.mock('@/hooks/use-task-categories', () => ({ useTaskCategories: () => mocks.categories() }));
vi.mock('./add-task-dialog', () => ({ AddTaskDialog: (): ReactNode => <div role="dialog">Add Task form</div> }));
vi.mock('@/hooks', () => ({ useUpdateMomTask: () => ({ mutate: mocks.mutate, isPending: false }) }));
vi.mock('@/hooks/use-meeting-lists', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-meeting-lists')>()),
  useMomTaskList: (filters: unknown) => mocks.list(filters),
}));
vi.mock('@/components/ui/user-search-select', () => ({ UserSearchSelect: (): ReactNode => null }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'committee_member' }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const TASK = {
  id: 't-1',
  title: 'Collect three quotes',
  description: null,
  status: 'pending',
  created_at: '2026-10-02T10:00:00Z',
  created_by_name: 'Asha Test',
  assignee_name: 'Ravi Test',
  due_date: '2026-10-30',
  meeting_title: 'October meeting',
  task_no: 7,
  category_name: 'Repairs',
};

describe('TasksContent', () => {
  beforeEach(() => {
    mocks.mutate.mockClear();
    mocks.categories.mockReturnValue({ data: [{ id: 'c-1', name: 'Repairs', is_active: true }, { id: 'c-2', name: 'Old', is_active: false }] });
    mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [TASK], total: 3, counts: { open: 3, closed: 2 } } });
  });

  it('reads Open(3) · Closed(2) in the status options and asks for the chosen state', () => {
    render(<TasksContent />);

    const options = [...(screen.getByLabelText('Status') as HTMLSelectElement).options].map((option) => option.textContent);
    expect(options).toEqual(['Open (3)', 'Closed (2)']);
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'open', page: 1 }));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'closed' } });
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'closed' }));
  });

  it('Close Task sends status completed for that task, with the remark when one is typed (PROJ-21)', () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('');
    render(<TasksContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Close Task' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ taskId: 't-1', data: { status: 'completed' } }, expect.anything());

    prompt.mockReturnValue(' Done by the plumber ');
    fireEvent.click(screen.getByRole('button', { name: 'Close Task' }));
    expect(mocks.mutate).toHaveBeenLastCalledWith(
      { taskId: 't-1', data: { status: 'completed', closed_remark: 'Done by the plumber' } },
      expect.anything(),
    );

    prompt.mockReturnValue(null);
    mocks.mutate.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Close Task' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('shows Task ID and Category, filters by category and opens Add Task (PROJ-20, PROJ-21)', () => {
    render(<TasksContent />);

    const headers = [...screen.getByRole('table').querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers.slice(0, 6)).toEqual(['S.No', 'Close Task', 'Task ID', 'Date', 'Category', 'Created By']);
    expect(screen.getByText('7')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c-1' } });
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 'c-1', page: 1 }));
    expect(screen.getByRole('option', { name: 'Old (retired)' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('Reopen brings a closed task back to open', () => {
    mocks.list.mockReturnValue({
      isLoading: false,
      data: { data: [{ ...TASK, status: 'completed' }], total: 1, counts: { open: 0, closed: 1 } },
    });
    render(<TasksContent />);

    expect(screen.queryByRole('button', { name: 'Close Task' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ taskId: 't-1', data: { status: 'pending' } }, expect.anything());
  });
});
