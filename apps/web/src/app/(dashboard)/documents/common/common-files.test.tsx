import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommonFiles } from './common-files';

/**
 * Admin Files › Common Files (FILE-10, screens FILE-S1 / S2): folders of
 * the root with their counts on the left, the chosen folder's files of
 * that root on the right, with who uploaded each.
 */

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/documents/common/admin',
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'community_admin' }));

const mocks = vi.hoisted(() => ({ useDocuments: vi.fn(), folders: vi.fn(), updateFolder: vi.fn() }));
vi.mock('@/hooks/use-documents', () => ({
  useDocuments: (filters: unknown) => mocks.useDocuments(filters),
  useDeleteDocument: () => ({ mutate: vi.fn() }),
  useUpdateFolder: () => ({ mutate: mocks.updateFolder, isPending: false }),
}));
vi.mock('@/hooks/use-document-files', () => ({ useDocumentFolders: (root: string) => mocks.folders(root) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const FOLDERS = [
  { id: 'f-empty', name: 'Bylaws', is_system: true, tenant_id: null, root: null, is_active: true, file_count: 0 },
  { id: 'f-min', name: 'Minutes', is_system: false, tenant_id: 't-1', root: 'admin', is_active: true, file_count: 2 },
  { id: 'f-old', name: 'Old Circulars', is_system: false, tenant_id: 't-1', root: null, is_active: false, file_count: 1 },
];
const FILE = {
  id: 'd-1',
  title: 'March minutes',
  file_name: 'march.pdf',
  created_at: '2026-10-01T10:00:00Z',
  uploaded_by_name: 'Asha Test',
  audience_role: null,
};

describe('CommonFiles', () => {
  beforeEach(() => {
    nav.search = '';
    nav.replace.mockClear();
    mocks.folders.mockReturnValue({ data: FOLDERS, isLoading: false });
    mocks.useDocuments.mockReset().mockReturnValue({ data: { data: [FILE], total: 1 }, isLoading: false });
  });

  it('shows each folder with its count and opens on the first folder holding files', () => {
    render(<CommonFiles root="admin" />);

    expect(mocks.folders).toHaveBeenCalledWith('admin');
    expect(screen.getByRole('button', { name: /Minutes Files\s*2/ }).getAttribute('aria-pressed')).toBe('true');
    expect(mocks.useDocuments).toHaveBeenLastCalledWith(
      expect.objectContaining({ folder_type: 'committee', category_id: 'f-min', page: 1 }),
    );
    expect(screen.getByText('Only people with admin access can see these files.')).toBeTruthy();
  });

  it('lists the files with who uploaded them, and View · Download · Edit · Archive', () => {
    render(<CommonFiles root="admin" />);

    expect(screen.getByText('Asha Test')).toBeTruthy();
    for (const name of ['View', 'Download', 'Edit', 'Archive']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe(
      `/documents/d-1/edit?return=${encodeURIComponent('/documents/common/admin?folder=f-min')}`,
    );
  });

  it('puts the chosen folder in the link and filters the folders by name', () => {
    render(<CommonFiles root="admin" />);

    fireEvent.click(screen.getByRole('button', { name: /Bylaws Files/ }));
    expect(nav.replace).toHaveBeenCalledWith('/documents/common/admin?folder=f-empty');

    fireEvent.change(screen.getByLabelText('Search by folder name'), { target: { value: 'min' } });
    expect(screen.queryByRole('button', { name: /Bylaws Files/ })).toBeNull();
  });

  it('shows the resident root with each file’s audience and uploads into it', () => {
    nav.search = 'folder=f-min';
    render(<CommonFiles root="residents" />);

    expect(mocks.useDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ folder_type: 'common' }));
    expect(screen.getByText('All residents')).toBeTruthy();
    expect(screen.getByText('Upload File').closest('a')?.getAttribute('href')).toBe('/documents/upload?root=residents&folder=f-min');
  });

  it('renames, moves and retires the chosen folder of the society (FILE-20)', () => {
    render(<CommonFiles root="admin" />);

    fireEvent.change(screen.getByLabelText('Folder name'), { target: { value: 'Committee Minutes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(mocks.updateFolder).toHaveBeenLastCalledWith({ id: 'f-min', name: 'Committee Minutes' }, expect.anything());

    fireEvent.change(screen.getByLabelText('Shown in'), { target: { value: 'both' } });
    expect(mocks.updateFolder).toHaveBeenLastCalledWith({ id: 'f-min', root: null }, expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Retire folder' }));
    expect(mocks.updateFolder).toHaveBeenLastCalledWith({ id: 'f-min', is_active: false }, expect.anything());
  });

  it('marks a retired folder and offers to re-activate it; a shared folder cannot be changed', () => {
    nav.search = 'folder=f-old';
    const { unmount } = render(<CommonFiles root="admin" />);
    expect(screen.getByRole('button', { name: /Old Circulars Files \(retired\)/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Re-activate folder' }));
    expect(mocks.updateFolder).toHaveBeenLastCalledWith({ id: 'f-old', is_active: true }, expect.anything());
    unmount();

    nav.search = 'folder=f-empty';
    render(<CommonFiles root="admin" />);
    expect(screen.getByText('A shared folder; it cannot be renamed or retired.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
  });
});
