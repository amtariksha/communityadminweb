import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddTaskDialog, addTaskPayload } from './add-task-dialog';

/** Add Task (PROJ-21): a task standing alone, with a category, assignee and due date. */
const mocks = vi.hoisted(() => ({ create: vi.fn(), addToast: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/ui/user-search-select', () => ({ UserSearchSelect: (): ReactNode => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/hooks', () => ({ useMeetings: () => ({ data: [{ id: 'm-1', title: 'October meeting', meeting_no: 4 }] }) }));
vi.mock('@/hooks/use-meetings', () => ({ useCreateStandaloneTask: () => ({ mutateAsync: mocks.create, isPending: false }) }));
vi.mock('@/hooks/use-task-categories', () => ({
  useTaskCategories: () => ({ data: [{ id: 'c-1', name: 'Repairs', is_active: true }, { id: 'c-2', name: 'Old', is_active: false }] }),
}));

describe('AddTaskDialog', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ id: 't-1' });
    mocks.addToast.mockClear();
  });

  it('adds a task without a meeting, with its category', async () => {
    const onClose = vi.fn();
    render(<AddTaskDialog open onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: ' Order 20 chairs ' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledWith({
      title: 'Order 20 chairs',
      description: null,
      category_id: 'c-1',
      assignee_id: null,
      due_date: null,
      meeting_id: null,
    });
  });

  it('offers active categories only and the meetings with their Meet.ID', () => {
    render(<AddTaskDialog open onClose={vi.fn()} />);
    expect(screen.queryByRole('option', { name: 'Old' })).toBeNull();
    expect(screen.getByRole('option', { name: '4 · October meeting' })).toBeTruthy();
  });

  it('asks for a description', () => {
    render(<AddTaskDialog open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('files the task under a chosen meeting', () => {
    const body = addTaskPayload({ title: 'Paint', description: '', category_id: '', due_date: '2026-11-30', meeting_id: 'm-1', recurrence: 'none' }, null);
    expect(body).toMatchObject({ meeting_id: 'm-1', due_date: '2026-11-30', category_id: null });
    expect(body).not.toHaveProperty('recurrence');
  });

  it('sends a recurrence when one is chosen (PROJ-46)', () => {
    const body = addTaskPayload({ title: 'Check the fire panel', description: '', category_id: '', due_date: '2026-10-26', meeting_id: '', recurrence: 'weekly' }, null);
    expect(body).toMatchObject({ recurrence: 'weekly', due_date: '2026-10-26' });
  });
});
