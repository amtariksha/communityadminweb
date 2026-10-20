import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsList } from './projects-list';

/**
 * Projects › List View (PROJ-41, screen PROJ-S3): the four selects apply on
 * Filter Projects, and the list asks the API for exactly those filters.
 */

const mocks = vi.hoisted(() => ({ list: vi.fn(), role: vi.fn() }));
vi.mock('@/hooks/use-projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-projects')>()),
  useProjectList: (filters: unknown) => mocks.list(filters),
  useProjectOptions: () => ({ data: { categories: ['Civil', 'Lift'], drivers: [{ id: 'u-1', name: 'Asha Test' }] } }),
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role() }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const ROW = {
  id: 'p-1',
  project_no: 4,
  category: 'Lift',
  topic: 'Replace lift ropes',
  status: 'open',
  priority: 'high',
  driven_by: null,
  driven_by_name: null,
  start_date: '2026-10-01',
  target_date: null,
  last_note: 'Quotes received',
  last_note_at: '2026-10-10T09:00:00Z',
  notes_count: 2,
  watching: true,
};

describe('ProjectsList', () => {
  beforeEach(() => {
    mocks.role.mockReturnValue('committee_member');
    mocks.list.mockReset().mockReturnValue({ isLoading: false, data: { data: [ROW], total: 1, counts: { open: 1, in_progress: 0, closed: 0 } } });
  });

  it('applies Status = Open and Priority = High only when Filter Projects is pressed', () => {
    render(<ProjectsList />);
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 25 }));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'open' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    expect(mocks.list).not.toHaveBeenLastCalledWith(expect.objectContaining({ status: 'open' }));

    fireEvent.click(screen.getByRole('button', { name: 'Filter Projects' }));
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'open', priority: 'high', page: 1 }));
  });

  it('offers Unassigned and the people driving projects, and shows the row with its LastUpdate', () => {
    render(<ProjectsList />);

    const drivers = [...(screen.getByLabelText('Driven By') as HTMLSelectElement).options].map((option) => option.textContent);
    expect(drivers).toEqual(['All', 'Unassigned', 'Asha Test']);
    expect(screen.getByText('Replace lift ropes')).toBeTruthy();
    expect(screen.getByText('Quotes received')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create Project' })).toBeTruthy();
  });

  it('hides Create Project from the accountant, and says when the API does not have projects yet', () => {
    mocks.role.mockReturnValue('accountant');
    mocks.list.mockReturnValue({ isLoading: false, error: { status: 404 } });
    render(<ProjectsList />);

    expect(screen.getByText('Projects are not available yet.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Create Project' })).toBeNull();
  });
});
