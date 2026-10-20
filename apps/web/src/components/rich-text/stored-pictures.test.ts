import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetStoredFileLinks } from '@/lib/stored-file';
import { pickedPictureHtml, showStoredPictures, storedPicturesHtml } from './stored-pictures';

/** Pictures in the welcome message: shown signed (or from the picked file), saved on their stored address. */

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post } }));
vi.mock('@/lib/auth', () => ({ getCurrentTenant: () => 'tenant-a' }));

const STORED = 'https://store.example.test/society-files/tenants/t/documents/pool.jpg';

describe('editor pictures', () => {
  beforeEach(() => {
    forgetStoredFileLinks();
    mocks.post.mockReset();
  });

  it('shows a stored picture through its signed link and saves its stored address', async () => {
    mocks.post.mockResolvedValueOnce({ data: { downloadUrl: `${STORED}?sig=1` } });
    const box = document.createElement('div');
    document.body.appendChild(box);
    box.innerHTML = `<p>Pool</p><img src="${STORED}" alt="">`;
    showStoredPictures(box);
    await vi.waitFor(() => expect(box.querySelector('img')?.getAttribute('src')).toBe(`${STORED}?sig=1`));
    expect(storedPicturesHtml(box)).toBe(`<p>Pool</p><img src="${STORED}" alt="">`);
    box.remove();
  });

  it('keeps the stored address of a picture that is not available', async () => {
    mocks.post.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'TypeError' }));
    const box = document.createElement('div');
    document.body.appendChild(box);
    box.innerHTML = `<img src="${STORED}">`;
    showStoredPictures(box);
    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(box.querySelector('img')?.getAttribute('src')).toBe(STORED);
    box.remove();
  });

  it('shows a picture just picked from the browser and saves its stored address', () => {
    const box = document.createElement('div');
    box.innerHTML = pickedPictureHtml(STORED, 'blob:picked');
    expect(box.querySelector('img')?.getAttribute('src')).toBe('blob:picked');
    expect(storedPicturesHtml(box)).toBe(`<img src="${STORED}">`);
  });
});
