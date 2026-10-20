import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryFilters, ViolationCategory } from '@/hooks/use-violations';
import { CategoryForm } from '../../_parts/category-form';
import { CategoriesContent } from './categories-content';

/** RULE-02 — Category Set Up (RULE-S2) and Add / Edit Category (RULE-S3). */

const state = vi.hoisted(() => ({
  rows: [] as ViolationCategory[],
  one: null as ViolationCategory | null,
  filters: [] as CategoryFilters[],
  create: vi.fn(),
  update: vi.fn(),
  toggle: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push, replace: state.push }),
  usePathname: () => '/violations/setup/categories',
}));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: (props: { value: string; onChange: (id: string) => void }): ReactNode => (
    <input aria-label="Penalty charge head" value={props.value} onChange={(event) => props.onChange(event.target.value)} />
  ),
}));
vi.mock('@/hooks/use-violations', () => ({
  useViolationCategories: (filters: CategoryFilters) => {
    state.filters.push(filters);
    const rows = state.rows.filter((row) => !filters.q || row.title.toLowerCase().includes(filters.q.toLowerCase()));
    return { data: { data: rows, total: rows.length }, isLoading: false, error: null, refetch: vi.fn() };
  },
  useViolationCategory: (id?: string) => ({ data: id ? state.one : undefined, isLoading: false, error: null }),
  useCreateCategory: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: state.update, isPending: false }),
  usePublishCategory: () => ({ mutateAsync: state.toggle, isPending: false }),
}));

function category(title: string, status: ViolationCategory['status'], extra: Partial<ViolationCategory> = {}): ViolationCategory {
  return {
    id: `id-${title}`,
    title,
    description: null,
    warning_days: 7,
    penalty_days: 15,
    penalty_amount: '500.00',
    apply_gst: true,
    income_account_id: 'income-1',
    status,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...extra,
  };
}

function fill(label: string, value: string): void {
  fireEvent.change(screen.getAllByLabelText(label)[0], { target: { value } });
}

beforeEach(() => {
  state.rows = [];
  state.one = null;
  state.filters = [];
  state.create.mockReset().mockImplementation(async (input) => ({ ...category(input.title, 'draft'), ...input }));
  state.update.mockReset();
  state.toggle.mockReset();
  state.push.mockReset();
});

describe('Category Set Up list', () => {
  it('numbers the categories with their status, and search asks the server', async () => {
    state.rows = [category('Gate Entry', 'published'), category('Visitor', 'draft'), category('Pets', 'inactive')];
    render(<CategoriesContent />);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['1', '2', '3']);
    expect(within(rows[0]).getByText('Published')).toBeTruthy();
    expect(within(rows[2]).getByText('Inactive')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'gate' } });
    await vi.waitFor(() => expect(state.filters.at(-1)?.q).toBe('gate'));
    expect(screen.getByText('Gate Entry')).toBeTruthy();
    expect(screen.queryByText('Visitor')).toBeNull();
  });

  it('says so when there are none', () => {
    render(<CategoriesContent />);

    expect(screen.getByText('There are no records.')).toBeTruthy();
  });
});

describe('Add / Edit Category', () => {
  it('saves a new category as a draft without publishing it', async () => {
    render(<CategoryForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    fill('Title', 'Gate Entry');
    fill('No of Days', '7');
    fireEvent.change(screen.getAllByLabelText('No of Days')[1], { target: { value: '15' } });
    fill('Penalty amount', '500');

    fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await vi.waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    expect(state.create.mock.calls[0][0]).toMatchObject({ title: 'Gate Entry', warning_days: 7, penalty_days: 15, penalty_amount: 500 });
    expect(state.toggle).not.toHaveBeenCalled();
  });

  it('shows the field error and publishes nothing when a field is invalid', () => {
    render(<CategoryForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    fill('Title', 'Gate Entry');
    fill('No of Days', '7');
    fireEvent.change(screen.getAllByLabelText('No of Days')[1], { target: { value: '15' } });
    fill('Penalty amount', '500');

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByText('Pick the penalty charge head')).toBeTruthy();
    expect(state.create).not.toHaveBeenCalled();
    expect(state.toggle).not.toHaveBeenCalled();
  });

  it('offers Save Changes and Unpublish on a published category', () => {
    state.one = category('Gate Entry', 'published');
    render(<CategoryForm mode="page" categoryId="id-Gate Entry" onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit Category' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('offers Save Changes and Publish on an inactive category', () => {
    state.one = category('Gate Entry', 'inactive');
    render(<CategoryForm mode="page" categoryId="id-Gate Entry" onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();
  });
});
