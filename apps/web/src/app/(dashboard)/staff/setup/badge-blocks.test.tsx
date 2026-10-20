import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceBlock, IdCardBlock } from './badge-blocks';

/** STAFF-43 — Staff Manager › Setup blocks 2 (ID card header, back text) and 4 (devices). */

const state = vi.hoisted(() => ({
  settings: undefined as undefined | null | { badge_header_image_url: string | null; badge_back_text: string },
  save: vi.fn(),
  file: null as File | null,
}));
vi.mock('@/hooks/use-staff-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-staff-settings')>()),
  useStaffSettings: () => ({ data: state.settings, isLoading: false, isError: false }),
  useSaveStaffSettings: () => ({ mutateAsync: state.save, isPending: false }),
}));
vi.mock('../../society-profile/profile-pictures', () => ({
  pickFile: async () => state.file,
  useUploadPicture: () => vi.fn(),
}));

beforeEach(() => {
  state.settings = { badge_header_image_url: null, badge_back_text: '' };
  state.save.mockReset().mockResolvedValue({});
  state.file = null;
});

describe('Staff Setup badge blocks', () => {
  it('says not available yet on an older API', () => {
    state.settings = null;
    render(<IdCardBlock editable />);
    expect(screen.getByText('Badge settings are not available yet.')).toBeTruthy();
  });

  it('uploads a PNG as the header and refuses a file over 1 MB', async () => {
    const upload = vi.fn().mockResolvedValue('https://files.example.test/tenants/t/header.png');
    render(<IdCardBlock editable upload={upload} />);
    state.file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload new image' }));
    });
    expect(screen.getByRole('alert').textContent).toContain('1 MB');
    expect(state.save).not.toHaveBeenCalled();

    state.file = new File(['png'], 'header.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload new image' }));
    });
    expect(state.save).toHaveBeenCalledWith({ badge_header_image_url: 'https://files.example.test/tenants/t/header.png' });
  });

  it('saves the back-side text and lets a reader only look', async () => {
    const { unmount } = render(<IdCardBlock editable />);
    fireEvent.change(screen.getByLabelText('Badge back-side text'), { target: { value: 'Return to the office' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save text' }));
    });
    expect(state.save).toHaveBeenCalledWith({ badge_back_text: 'Return to the office' });
    unmount();

    render(<IdCardBlock editable={false} />);
    expect(screen.queryByRole('button', { name: 'Upload new image' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save text' })).toBeNull();
  });

  it('Device Management says there are no attendance devices', () => {
    render(<DeviceBlock />);
    expect(screen.getByText('No attendance devices are set up for this society.')).toBeTruthy();
  });
});
