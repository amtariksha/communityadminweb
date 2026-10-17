import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSwitch } from './dashboard-switch';

/** DASH-08 — the classic layout gets the classic dashboard; everyone else keeps today's page. */

const mocks = vi.hoisted(() => ({ layout: 'standard' as 'standard' | 'classic' }));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => mocks.layout }));
vi.mock('../dashboard-content', () => ({ default: () => <p>today&apos;s dashboard</p> }));
vi.mock('./classic-dashboard', () => ({ ClassicDashboard: () => <p>classic dashboard</p> }));

describe('DashboardSwitch', () => {
  beforeEach(() => {
    mocks.layout = 'standard';
  });

  it('is today\'s page on the standard layout', () => {
    render(<DashboardSwitch />);

    expect(screen.getByText("today's dashboard")).toBeTruthy();
    expect(screen.queryByText('classic dashboard')).toBeNull();
  });

  it('is the classic dashboard on the classic layout', () => {
    mocks.layout = 'classic';
    render(<DashboardSwitch />);

    expect(screen.getByText('classic dashboard')).toBeTruthy();
    expect(screen.queryByText("today's dashboard")).toBeNull();
  });
});
