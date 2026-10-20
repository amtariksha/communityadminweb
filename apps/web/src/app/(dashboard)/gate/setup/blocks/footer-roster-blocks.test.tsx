import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PassFooterBlock, footerProblem } from './pass-footer-block';
import { GuardRosterBlock } from './guard-roster-block';

/** Setup blocks 6 (pass footer, GATE-46) and 9 (guard roster, GATE-47). */

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: vi.fn() }) }));
const roster = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock('@/hooks/use-gate-desk', () => ({ useGuardRoster: () => roster.value }));

const SWITCHES = {
  capture_vehicle_details: false,
  guard_may_call_resident: false,
  block_visitor_photos: false,
  unit_checkin_alert_threshold: null,
  auto_checkout_hours: null,
  investigator_lock: true,
  pass_footer_image_url: 'https://store.example.com/files/tenants/t/footer.png',
};

describe('Visitor Pass Footer Image block', () => {
  it('shows the saved footer and removes it', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<PassFooterBlock switches={SWITCHES} editable save={save} />);

    expect(screen.getByAltText('Pass footer').getAttribute('src')).toBe(SWITCHES.pass_footer_image_url);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    });
    expect(save).toHaveBeenCalledWith({ pass_footer_image_url: null });
  });

  it('takes PNG or JPEG up to 1 MB only', () => {
    expect(footerProblem({ type: 'image/png', size: 500_000 })).toBeNull();
    expect(footerProblem({ type: 'image/gif', size: 500_000 })).toMatch(/PNG or JPEG/);
    expect(footerProblem({ type: 'image/jpeg', size: 2_000_000 })).toMatch(/1 MB/);
  });

  it('says not available yet against an older API', () => {
    const { pass_footer_image_url: _footer, ...older } = SWITCHES;
    render(<PassFooterBlock switches={older} editable save={vi.fn()} />);
    expect(screen.getByText('Pass footer images are not available yet.')).toBeTruthy();
  });
});

describe('Guard Roster block', () => {
  it('lists who signs in to the guard app with the last four digits and last sign-in', () => {
    roster.value = {
      data: [
        { user_id: 'u1', name: 'Test Guard', phone_last4: '0050', roles: ['security_guard'], last_sign_in_at: null, is_active: true },
      ],
      isLoading: false,
    };
    render(<GuardRosterBlock />);
    expect(screen.getByText('Test Guard')).toBeTruthy();
    expect(screen.getByText('••0050')).toBeTruthy();
    expect(screen.getByText('Never')).toBeTruthy();
    expect(screen.getByText('Staff Manager').getAttribute('href')).toBe('/staff/active');
  });
});
