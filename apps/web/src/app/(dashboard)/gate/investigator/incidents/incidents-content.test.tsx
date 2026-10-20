import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IncidentsContent } from './incidents-content';

/**
 * Incident Investigator › Incidents (GATE-42, screen GATE-S7): the columns of
 * the screen, filters as query parameters, View with Close Incident for the
 * gate admins, and "not available yet" against an older API.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/lib/date', () => ({ todayIST: () => '2026-10-19' }));
const download = vi.hoisted(() => vi.fn());
const signLink = vi.hoisted(() => vi.fn(async () => ({ data: { downloadUrl: 'https://signed.example.test/a.jpg' } })));
vi.mock('@/lib/api', () => ({ api: { download, post: signLink } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));

const mocks = vi.hoisted(() => ({
  useGateIncidents: vi.fn(),
  closeIncident: vi.fn(),
  canWrite: vi.fn(),
}));
vi.mock('@/hooks/use-gate-incidents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-gate-incidents')>()),
  useGateIncidents: (filters: Record<string, unknown>) => mocks.useGateIncidents(filters),
  useCloseIncident: () => ({ mutateAsync: mocks.closeIncident }),
}));
vi.mock('@/hooks/use-gate-lists', () => ({
  useIncidentCategories: () => ({ data: [{ id: 'c-theft', name: 'Theft', is_active: true, sort_order: 1 }] }),
}));
vi.mock('@/hooks/use-staff', () => ({ useGates: () => ({ data: [{ id: 'g1', name: 'Main Gate' }] }) }));
vi.mock('../../setup/blocks/setup-block', () => ({ canWriteGateSetup: () => mocks.canWrite() }));

const INCIDENT = {
  id: 'i1',
  incident_no: 7,
  category_id: 'c-theft',
  category_name: 'Theft',
  description: 'Bicycle missing from the stand',
  gate_id: 'g1',
  gate_name: 'Main Gate',
  unit_id: null,
  unit_number: null,
  block: null,
  photo_urls: ['https://store.example.com/files/tenants/t/documents/a.jpg', 'javascript:alert(1)'],
  occurred_at: '2026-10-19T04:30:00.000Z',
  raised_by: 'u-guard',
  raised_by_name: 'Test Guard',
  status: 'open',
  closed_by: null,
  closed_by_name: null,
  closed_at: null,
  closing_remark: null,
  created_at: '2026-10-19T04:31:00.000Z',
};

const lastFilters = (): Record<string, unknown> => mocks.useGateIncidents.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  mocks.useGateIncidents.mockReset().mockReturnValue({ data: { data: [INCIDENT], total: 1 }, isLoading: false });
  mocks.closeIncident.mockReset().mockResolvedValue({});
  mocks.canWrite.mockReset().mockReturnValue(true);
});

describe('Incident Investigator › Incidents', () => {
  it('shows the screen’s columns', () => {
    render(<IncidentsContent />);
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No', 'Incident No.', 'Incident Date', 'Category', 'Description', 'Gate', 'Raised By', 'Status', 'View',
    ]);
  });

  it('sends status, category and gate as query parameters', () => {
    const { container } = render(<IncidentsContent />);
    fireEvent.change(container.querySelector('select#incident-status') as HTMLSelectElement, { target: { value: 'open' } });
    fireEvent.change(container.querySelector('select#incident-category') as HTMLSelectElement, { target: { value: 'c-theft' } });
    fireEvent.change(container.querySelector('select#incident-gate') as HTMLSelectElement, { target: { value: 'g1' } });
    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'open', category_id: 'c-theft', gate_id: 'g1', page: 1 }));
  });

  it('View shows only https photos and closes the incident with a remark', async () => {
    render(<IncidentsContent />);
    const row = screen.getByText('Bicycle missing from the stand').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'View' }));

    const photos = await screen.findAllByAltText('Incident photo');
    expect(photos).toHaveLength(1);
    expect(photos[0].getAttribute('src')).toBe('https://signed.example.test/a.jpg');
    expect(signLink).toHaveBeenCalledWith(
      '/upload/download-url',
      expect.objectContaining({ file_url: 'https://store.example.com/files/tenants/t/documents/a.jpg', disposition: 'inline' }),
      undefined,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close Incident' }));
    expect(screen.getByRole('alert').textContent).toContain('at least 5');

    fireEvent.change(screen.getByLabelText('Closing remark'), { target: { value: 'Found near block B' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close Incident' }));
    });
    expect(mocks.closeIncident).toHaveBeenCalledWith({ id: 'i1', closing_remark: 'Found near block B' });
  });

  it('offers no Close Incident to a read-only role', () => {
    mocks.canWrite.mockReturnValue(false);
    render(<IncidentsContent />);
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.queryByRole('button', { name: 'Close Incident' })).toBeNull();
  });

  it('says not available yet against an older API', () => {
    mocks.useGateIncidents.mockReturnValue({ data: null, isLoading: false });
    render(<IncidentsContent />);
    expect(screen.getByText('The incident log is not available yet.')).toBeTruthy();
  });
});
