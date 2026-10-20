import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { forgetStoredFileLinks } from '@/lib/stored-file';
import { useLocalPreviews, useOpenStoredFile } from '@/hooks/use-stored-file';
import { StoredImage } from './stored-image';

/** Stored pictures and files on screen: through a signed link, the placeholder when not available. */

const mocks = vi.hoisted(() => ({ post: vi.fn(), toast: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post } }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 'tenant-a' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));

const RAW = 'https://store.example.test/society-files/tenants/t/documents/a.jpg';
const notFound = new ApiError(404, { statusCode: 404, error: 'Not Found', message: 'No', request_id: 'r', timestamp: '', code: 'file_not_found' } as never);

describe('StoredImage', () => {
  beforeEach(() => {
    forgetStoredFileLinks();
    mocks.post.mockReset();
    mocks.toast.mockReset();
  });

  it('shows the placeholder, then the picture through its signed link', async () => {
    mocks.post.mockResolvedValueOnce({ data: { downloadUrl: `${RAW}?sig=1` } });
    render(<StoredImage src={RAW} alt="Listing" placeholder={<span>Loading</span>} fallback={<span>No picture</span>} />);
    expect(screen.getByText('Loading')).toBeTruthy();
    expect((await screen.findByAltText('Listing')).getAttribute('src')).toBe(`${RAW}?sig=1`);
  });

  it('shows the fallback when the picture is not available, or there is none', async () => {
    mocks.post.mockRejectedValueOnce(notFound);
    const { unmount } = render(<StoredImage src={RAW} alt="Listing" fallback={<span>No picture</span>} />);
    expect(await screen.findByText('No picture')).toBeTruthy();
    expect(screen.queryByAltText('Listing')).toBeNull();
    unmount();
    render(<StoredImage src={null} alt="Listing" fallback={<span>Nothing yet</span>} />);
    expect(screen.getByText('Nothing yet')).toBeTruthy();
  });

  it('shows a local preview at once, with no call', () => {
    render(<StoredImage src="blob:https://admin.example.test/1" alt="Preview" />);
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('blob:https://admin.example.test/1');
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('shows the fallback when the picture does not load', async () => {
    mocks.post.mockResolvedValueOnce({ data: { downloadUrl: `${RAW}?sig=2` } });
    render(<StoredImage src={RAW} alt="Listing" fallback={<span>No picture</span>} />);
    fireEvent.error(await screen.findByAltText('Listing'));
    expect(screen.getByText('No picture')).toBeTruthy();
  });
});

function OpenButton({ url }: { url: string }) {
  const open = useOpenStoredFile();
  return (
    <button type="button" onClick={() => void open(url, { fileName: 'a.jpg' })}>
      Open
    </button>
  );
}

describe('useOpenStoredFile', () => {
  beforeEach(() => {
    forgetStoredFileLinks();
    mocks.post.mockReset();
    mocks.toast.mockReset();
  });

  it('tells the person when the file is not available', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    mocks.post.mockRejectedValueOnce(notFound);
    render(<OpenButton url={RAW} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    });
    expect(open).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'This file is not available' }));
    open.mockRestore();
  });
});

function Preview({ file }: { file: File }) {
  const previews = useLocalPreviews();
  return (
    <>
      <button type="button" onClick={() => previews.remember(RAW, file)}>
        Pick
      </button>
      <span data-testid="shown">{previews.previewOf(RAW)}</span>
    </>
  );
}

describe('useLocalPreviews', () => {
  it('shows a picked file from the browser until the page closes', () => {
    URL.createObjectURL = vi.fn(() => 'blob:picked');
    URL.revokeObjectURL = vi.fn();
    const { unmount } = render(<Preview file={new File(['x'], 'a.jpg', { type: 'image/jpeg' })} />);
    expect(screen.getByTestId('shown').textContent).toBe(RAW);
    fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
    expect(screen.getByTestId('shown').textContent).toBe('blob:picked');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picked');
  });
});
