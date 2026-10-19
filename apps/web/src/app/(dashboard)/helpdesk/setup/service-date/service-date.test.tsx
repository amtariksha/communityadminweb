import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServiceDateSwitches } from './service-date-switches';

/**
 * Setup › Setup Preferred Service Date (HELP-16, screen HELP-S2): each tick
 * saves at once and goes back when the save fails.
 */

const addBox = () => screen.getByLabelText('Allow owners/tenants to add Preferred Service Date') as HTMLInputElement;
const editBox = () => screen.getByLabelText('Allow owners/tenants to edit Preferred Service Date') as HTMLInputElement;

describe('ServiceDateSwitches', () => {
  it('shows the stored switches under their two headings', () => {
    render(
      <ServiceDateSwitches
        settings={{ allow_resident_add_psd: true, allow_resident_edit_psd: false }}
        canEdit
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Preferred Service Date' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Edit Preferred Service Date' })).toBeTruthy();
    expect(addBox().checked).toBe(true);
    expect(editBox().checked).toBe(false);
  });

  it('saves a tick on its own, at once', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ServiceDateSwitches settings={{ allow_resident_add_psd: false, allow_resident_edit_psd: false }} canEdit onSave={onSave} />,
    );

    await act(async () => {
      fireEvent.click(editBox());
    });

    expect(onSave).toHaveBeenCalledWith({ allow_resident_edit_psd: true });
    expect(editBox().checked).toBe(true);
  });

  it('puts the box back when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network'));
    render(
      <ServiceDateSwitches settings={{ allow_resident_add_psd: false, allow_resident_edit_psd: false }} canEdit onSave={onSave} />,
    );

    await act(async () => {
      fireEvent.click(addBox());
    });

    expect(addBox().checked).toBe(false);
  });

  it('is read-only for roles that cannot save', () => {
    render(
      <ServiceDateSwitches settings={{ allow_resident_add_psd: false, allow_resident_edit_psd: false }} canEdit={false} onSave={vi.fn()} />,
    );

    expect(addBox().disabled).toBe(true);
    expect(editBox().disabled).toBe(true);
  });
});
