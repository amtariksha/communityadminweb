import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SocietyProfile } from '@/hooks/use-society-profile';
import { withSlot } from './picture-slots';
import { ProfileImages } from './profile-images';

/** Society Profile › Images (PROF-22): six slots in order and the logo, each saved on its own. */
const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/use-society-profile', () => ({ useUpdateSocietyProfile: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }) }));
// Each stored picture is shown through a signed link (lib/stored-file.ts).
vi.mock('@/lib/api', () => ({
  api: { post: async (_path: string, body: { file_url: string }) => ({ data: { downloadUrl: `${body.file_url}?signed=1` } }) },
}));

const ONE = 'https://objects.example.test/society-files/tenants/t/documents/1.jpg';
const THREE = 'https://objects.example.test/society-files/tenants/t/documents/3.jpg';
const PROFILE = { images: [ONE, null, THREE], logo_url: null } as unknown as SocietyProfile;

describe('ProfileImages', () => {
  beforeEach(() => mocks.mutateAsync.mockReset().mockResolvedValue({}));

  it('shows the pictures in their slots, each through a signed link', async () => {
    render(<ProfileImages profile={PROFILE} canEditPictures canEditLogo />);
    expect((await within(screen.getByRole('group', { name: 'Image 1' })).findByRole('img')).getAttribute('src')).toBe(`${ONE}?signed=1`);
    expect(within(screen.getByRole('group', { name: 'Image 2' })).getByText('No picture')).toBeTruthy();
    expect((await within(screen.getByRole('group', { name: 'Image 3' })).findByRole('img')).getAttribute('src')).toBe(`${THREE}?signed=1`);
  });

  it('removes one picture and keeps the others in their slots', async () => {
    render(<ProfileImages profile={PROFILE} canEditPictures canEditLogo />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Image 1' })).getByRole('button', { name: 'Remove image' }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ images: [null, null, THREE] }));
  });

  it('lets a committee member change pictures but not the logo', () => {
    render(<ProfileImages profile={PROFILE} canEditPictures canEditLogo={false} />);
    expect(within(screen.getByRole('group', { name: 'Image 2' })).getByRole('button', { name: 'Upload image' })).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Society Logo' })).queryByRole('button')).toBeNull();
  });

  it('sets or clears one slot of six, dropping empty slots at the end', () => {
    expect(withSlot([ONE], 3, THREE)).toEqual([ONE, null, null, THREE]);
    expect(withSlot([ONE, null, THREE], 2, null)).toEqual([ONE]);
    expect(withSlot([], 5, ONE)).toHaveLength(6);
  });
});
