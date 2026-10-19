import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksContent } from './tasks-content';

/**
 * Tasks (PROJ-12, screen PROJ-S11): the status options carry the server's
 * counts, Close Task in the first column closes the task, Reopen brings a
 * closed one back.
 */

const mocks = vi.hoisted(() => ({ list: vi.fn(), mutate: vi.fn() }));
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
};

describe('TasksContent', () => {
  beforeEach(() => {
    mocks.mutate.mockClear();
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

  it('Close Task sends status completed for that task', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TasksContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Close Task' }));
    expect(mocks.mutate).toHaveBeenCalledWith({ taskId: 't-1', data: { status: 'completed' } }, expect.anything());
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
