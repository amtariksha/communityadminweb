import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GateSettings, GateSwitches } from '@/hooks/use-gate-settings';
import { GuardAppBlock } from './guard-app-block';
import { CheckinAlertBlock } from './checkin-alert-block';
import { OverstayBlock, overstayChanges } from './overstay-block';
import { readOptionalWholeNumber } from './number-setting';

/**
 * Gate & Visitors › Setup (GATE-40): each block saves only its own switches
 * through PATCH /tenant-settings/gate, keeps its error and typed values on a
 * failed save, and says "not available yet" against an API without them.
 */

const SWITCHES: GateSwitches = {
  capture_vehicle_details: false,
  guard_may_call_resident: false,
  block_visitor_photos: false,
  unit_checkin_alert_threshold: null,
  auto_checkout_hours: null,
};

const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

describe('Guard App Settings block', () => {
  it('saves the three ticks together', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<GuardAppBlock switches={SWITCHES} editable save={save} />);

    fireEvent.click(screen.getByLabelText(/Capture complete vehicle details/));
    fireEvent.click(screen.getByLabelText(/Do not allow visitor photos/));
    await click('Save');

    expect(save).toHaveBeenCalledWith({
      capture_vehicle_details: true,
      guard_may_call_resident: false,
      block_visitor_photos: true,
    });
  });

  it('keeps the ticks and shows the error inside the block when the save fails', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Network down'));
    render(<GuardAppBlock switches={SWITCHES} editable save={save} />);

    fireEvent.click(screen.getByLabelText(/Guard may call the resident/));
    await click('Save');

    expect(screen.getByRole('alert').textContent).toBeTruthy();
    expect((screen.getByLabelText(/Guard may call the resident/) as HTMLInputElement).checked).toBe(true);
  });

  it('turns the investigator lock off with the other ticks (GATE-43)', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<GuardAppBlock switches={{ ...SWITCHES, investigator_lock: true }} editable save={save} />);

    fireEvent.click(screen.getByLabelText(/Lock the visitor and vehicle logs/));
    await click('Save');

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ investigator_lock: false }));
  });

  it('says not available yet against an older API', () => {
    render(<GuardAppBlock switches={undefined} editable save={vi.fn()} />);
    expect(screen.getByText('Guard app settings are not available yet.')).toBeTruthy();
  });

  it('shows no Save to a read-only role', () => {
    render(<GuardAppBlock switches={SWITCHES} editable={false} save={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});

describe('Visitor Check-in Alert block', () => {
  it('saves a number, and empty as off', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(<CheckinAlertBlock switches={SWITCHES} editable save={save} />);
    fireEvent.change(screen.getByLabelText(/exceed/), { target: { value: '3' } });
    await click('Save');
    expect(save).toHaveBeenLastCalledWith({ unit_checkin_alert_threshold: 3 });
    unmount();

    render(<CheckinAlertBlock switches={{ ...SWITCHES, unit_checkin_alert_threshold: 3 }} editable save={save} />);
    fireEvent.change(screen.getByLabelText(/exceed/), { target: { value: '' } });
    await click('Save');
    expect(save).toHaveBeenLastCalledWith({ unit_checkin_alert_threshold: null });
  });

  it('refuses 100 before sending', async () => {
    const save = vi.fn();
    render(<CheckinAlertBlock switches={SWITCHES} editable save={save} />);
    fireEvent.change(screen.getByLabelText(/exceed/), { target: { value: '100' } });
    await click('Save');
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Between 1 and 99');
  });
});

describe('Overstay & Auto Check-Out block', () => {
  const SETTINGS: GateSettings = { overstay_threshold_minutes: 240, gate_settings: SWITCHES };

  it('sends only what changed: the threshold at the top, auto check-out inside gate_settings', () => {
    expect(overstayChanges(SETTINGS, '60', '')).toEqual({ changes: { overstay_threshold_minutes: 60 } });
    expect(overstayChanges(SETTINGS, '240', '12')).toEqual({ changes: { gate_settings: { auto_checkout_hours: 12 } } });
    expect(overstayChanges(SETTINGS, '10', '')).toHaveProperty('message');
    expect(overstayChanges(SETTINGS, '240', '49')).toHaveProperty('message');
  });

  it('saves auto check-out hours', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<OverstayBlock settings={SETTINGS} editable save={save} />);
    fireEvent.change(screen.getByLabelText(/Auto check-out visitors after/), { target: { value: '12' } });
    await click('Save');
    expect(save).toHaveBeenCalledWith({ gate_settings: { auto_checkout_hours: 12 } });
  });

  it('offers only the threshold against an older API', () => {
    render(<OverstayBlock settings={{ overstay_threshold_minutes: 240 }} editable save={vi.fn()} />);
    expect(screen.queryByLabelText(/Auto check-out visitors after/)).toBeNull();
    expect(screen.getByText('Auto check-out is not available yet.')).toBeTruthy();
  });
});

describe('readOptionalWholeNumber', () => {
  it('reads empty as off and refuses fractions', () => {
    expect(readOptionalWholeNumber(' ', 1, 48, 'hours')).toEqual({ ok: true, value: null });
    expect(readOptionalWholeNumber('1.5', 1, 48, 'hours').ok).toBe(false);
  });
});
