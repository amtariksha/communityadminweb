import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgreementVersions } from '@/hooks/use-society-agreement';
import { AgreementSummary } from './agreement-summary';

/** Society Profile › User Agreement (PROF-S4): the switch, the current version and "N of M residents". */
const mocks = vi.hoisted(() => ({
  versions: { isLoading: false, error: null as unknown, data: undefined as AgreementVersions | undefined },
  stats: { data: { accepted: 12, residents: 40 } as { accepted: number; residents: number } | undefined },
  mutate: vi.fn(),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/use-society-agreement', () => ({
  agreementKeys: { all: ['society-agreement'] },
  useAgreementVersions: () => mocks.versions,
  useAgreementStats: () => mocks.stats,
}));
vi.mock('@/hooks/use-society-profile', () => ({ useUpdateSocietyProfile: () => ({ mutate: mocks.mutate, isPending: false }) }));

const v1 = { id: 'a1', version: 1, body_html: '<p>Rules</p>', status: 'published' as const, published_at: '2026-10-01T05:00:00Z', created_at: '', updated_at: '' };

function withData(data: Partial<AgreementVersions>): void {
  mocks.versions = {
    isLoading: false,
    error: null,
    data: { versions: [{ id: 'a1', version: 1, status: 'published', published_at: v1.published_at, acceptances: 12 }], editable: v1, current: v1, enabled: false, ...data },
  };
}

describe('AgreementSummary', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows the current version and how many residents have accepted it', () => {
    withData({});
    render(<AgreementSummary role="community_admin" />);
    expect(screen.getByText('Version 1')).toBeTruthy();
    expect(screen.getByTestId('agreement-acceptance').textContent).toBe('12 of 40 residents have accepted');
    expect(screen.getByRole('link', { name: 'Read/Edit Default Agreement' }).getAttribute('href')).toBe('/society-profile/agreement/edit');
  });

  it('the button is the switch: Enable sends agreement_enabled after asking, Disable switches it off', () => {
    withData({ enabled: false });
    const { unmount } = render(<AgreementSummary role="community_admin" />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable User Agreement' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.mutate).toHaveBeenCalledWith({ agreement_enabled: true }, expect.anything());
    unmount();
    withData({ enabled: true });
    render(<AgreementSummary role="community_admin" />);
    fireEvent.click(screen.getByRole('button', { name: 'Disable User Agreement' }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({ agreement_enabled: false }, expect.anything());
  });

  it('cannot be switched on before a version is published, and only by the community admin', () => {
    withData({ current: null, versions: [] });
    const { unmount } = render(<AgreementSummary role="community_admin" />);
    expect((screen.getByRole('button', { name: 'Enable User Agreement' }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    withData({});
    render(<AgreementSummary role="committee_member" />);
    expect(screen.queryByRole('button', { name: /User Agreement/ })).toBeNull();
  });

  it('says plainly when the API does not have the agreement yet', () => {
    mocks.versions = { isLoading: false, error: { status: 404 }, data: undefined };
    render(<AgreementSummary role="community_admin" />);
    expect(screen.getByText('The user agreement is not available yet.')).toBeTruthy();
  });
});
