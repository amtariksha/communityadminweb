import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import {
  forgetStoredFileLinks,
  openStoredFile,
  peekStoredFileLink,
  storedFileLink,
  storedFileLinkByKey,
} from './stored-file';

/**
 * Signed links to stored files (private bucket): the API's answer decides
 * between the signed link, "not available" (null) and the raw address.
 */

const mocks = vi.hoisted(() => ({ post: vi.fn(), tenant: 'tenant-a' as string | null }));
vi.mock('./api', () => ({ api: { post: mocks.post } }));
vi.mock('./auth', () => ({ getCurrentTenant: () => mocks.tenant }));

const RAW = 'https://store.example.test/society-files/tenants/t/documents/plan.pdf';
const SIGNED = 'https://store.example.test/society-files/tenants/t/documents/plan.pdf?X-Signature=abc';

function apiError(status: number, code?: string): ApiError {
  return new ApiError(status, { statusCode: status, error: 'Error', message: 'Failed', request_id: 'r', timestamp: '', ...(code ? { code } : {}) } as never);
}

function signs(url = SIGNED, expiresAt?: string): void {
  mocks.post.mockResolvedValueOnce({ data: { downloadUrl: url, ...(expiresAt ? { expiresAt } : {}) } });
}

describe('storedFileLink', () => {
  beforeEach(() => {
    forgetStoredFileLinks();
    mocks.post.mockReset();
    mocks.tenant = 'tenant-a';
  });
  afterEach(() => vi.useRealTimers());

  it('gives the signed link of a stored file (201), asked inline with no name for a picture', async () => {
    signs();
    await expect(storedFileLink(RAW)).resolves.toBe(SIGNED);
    expect(mocks.post).toHaveBeenCalledWith('/upload/download-url', { file_url: RAW, disposition: 'inline', file_name: undefined }, undefined);
  });

  it('passes the disposition and file name of a download', async () => {
    signs();
    await storedFileLink(RAW, { disposition: 'attachment', fileName: 'Plan.pdf' });
    expect(mocks.post).toHaveBeenCalledWith('/upload/download-url', { file_url: RAW, disposition: 'attachment', file_name: 'Plan.pdf' }, undefined);
  });

  it('signs under another society when told to (super admin)', async () => {
    signs();
    await storedFileLink(RAW, { tenantId: 'tenant-b' });
    expect(mocks.post).toHaveBeenCalledWith('/upload/download-url', expect.anything(), { headers: { 'x-tenant-id': 'tenant-b' } });
  });

  it('gives null for a file the person may not open (404 file_not_found)', async () => {
    mocks.post.mockRejectedValueOnce(apiError(404, 'file_not_found'));
    await expect(storedFileLink(RAW)).resolves.toBeNull();
  });

  it('gives the raw address of a file that is not ours (400 file_url_not_ours), and remembers it', async () => {
    mocks.post.mockRejectedValueOnce(apiError(400, 'file_url_not_ours'));
    await expect(storedFileLink('https://elsewhere.example.test/a.png')).resolves.toBe('https://elsewhere.example.test/a.png');
    await expect(storedFileLink('https://elsewhere.example.test/a.png')).resolves.toBe('https://elsewhere.example.test/a.png');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a 404 with no code (an API without the route)', apiError(404)],
    ['a 403 with no code', apiError(403)],
    ['a 400 with no code', apiError(400)],
    ['a 500', apiError(500)],
    ['a network error', new TypeError('Failed to fetch')],
  ])('falls back to the raw address on %s', async (_label, failure) => {
    mocks.post.mockRejectedValueOnce(failure);
    await expect(storedFileLink(RAW)).resolves.toBe(RAW);
  });

  it('falls back to the raw address when the response has no link', async () => {
    mocks.post.mockResolvedValueOnce({ data: {} });
    await expect(storedFileLink(RAW)).resolves.toBe(RAW);
  });

  it.each(['data:image/png;base64,AAAA', 'blob:https://admin.example.test/1', '/logo.svg', 'file:///tmp/a.png', ''])(
    'uses %j as it is, with no call',
    async (value) => {
      await expect(storedFileLink(value)).resolves.toBe(value);
      expect(peekStoredFileLink(value)).toBe(value);
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it('asks once for a file many pictures want at the same moment, then serves it from memory', async () => {
    signs();
    const [first, second] = await Promise.all([storedFileLink(RAW), storedFileLink(RAW)]);
    expect([first, second]).toEqual([SIGNED, SIGNED]);
    await expect(storedFileLink(RAW)).resolves.toBe(SIGNED);
    expect(peekStoredFileLink(RAW)).toBe(SIGNED);
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('keeps a link until five minutes before it expires, then asks again', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'));
    signs(SIGNED, '2026-10-20T11:00:00Z');
    await storedFileLink(RAW);
    vi.setSystemTime(new Date('2026-10-20T10:54:00Z'));
    await expect(storedFileLink(RAW)).resolves.toBe(SIGNED);
    expect(mocks.post).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-10-20T10:55:01Z'));
    expect(peekStoredFileLink(RAW)).toBeUndefined();
    signs(`${SIGNED}-2`);
    await expect(storedFileLink(RAW)).resolves.toBe(`${SIGNED}-2`);
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });

  it('keeps a link with no expiry for 45 minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'));
    signs();
    await storedFileLink(RAW);
    vi.setSystemTime(new Date('2026-10-20T10:44:00Z'));
    expect(peekStoredFileLink(RAW)).toBe(SIGNED);
    vi.setSystemTime(new Date('2026-10-20T10:46:00Z'));
    expect(peekStoredFileLink(RAW)).toBeUndefined();
  });

  it('does not remember "not available" or a fallback', async () => {
    mocks.post.mockRejectedValueOnce(apiError(404, 'file_not_found'));
    await storedFileLink(RAW);
    mocks.post.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await storedFileLink(RAW);
    signs();
    await expect(storedFileLink(RAW)).resolves.toBe(SIGNED);
    expect(mocks.post).toHaveBeenCalledTimes(3);
  });

  it('holds links apart per society, disposition and name', async () => {
    signs('https://signed.example.test/1');
    signs('https://signed.example.test/2');
    signs('https://signed.example.test/3');
    await storedFileLink(RAW);
    await storedFileLink(RAW, { disposition: 'attachment', fileName: 'Plan.pdf' });
    mocks.tenant = 'tenant-b';
    await expect(storedFileLink(RAW)).resolves.toBe('https://signed.example.test/3');
    expect(mocks.post).toHaveBeenCalledTimes(3);
  });
});

describe('storedFileLinkByKey', () => {
  beforeEach(() => {
    forgetStoredFileLinks();
    mocks.post.mockReset();
  });

  it('signs a file known by its key', async () => {
    signs();
    await expect(storedFileLinkByKey('tenants/t/documents/f1.pdf', { disposition: 'attachment', fileName: 'f1.pdf' })).resolves.toBe(SIGNED);
    expect(mocks.post).toHaveBeenCalledWith(
      '/upload/download-url',
      { key: 'tenants/t/documents/f1.pdf', disposition: 'attachment', file_name: 'f1.pdf' },
      undefined,
    );
  });

  it('gives null when not available, and throws on any other failure (no raw address to fall back on)', async () => {
    mocks.post.mockRejectedValueOnce(apiError(404, 'file_not_found'));
    await expect(storedFileLinkByKey('k1')).resolves.toBeNull();
    mocks.post.mockRejectedValueOnce(apiError(500));
    await expect(storedFileLinkByKey('k1')).rejects.toBeInstanceOf(ApiError);
  });
});

interface FakeTab {
  opener: unknown;
  location: { replace: ReturnType<typeof vi.fn> };
  close: ReturnType<typeof vi.fn>;
}

function fakeTab(): FakeTab {
  return { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
}

describe('openStoredFile', () => {
  beforeEach(() => {
    forgetStoredFileLinks();
    mocks.post.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the tab inside the click, before the link arrives, then sends it to the signed link', async () => {
    const tab = fakeTab();
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    signs();
    const opening = openStoredFile(RAW, { fileName: 'Plan.pdf' });
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(tab.opener).toBeNull();
    expect(tab.location.replace).not.toHaveBeenCalled();
    await expect(opening).resolves.toBe(true);
    expect(tab.location.replace).toHaveBeenCalledWith(SIGNED);
  });

  it('opens a link it already holds at once', async () => {
    signs(SIGNED, new Date(Date.now() + 3_600_000).toISOString());
    await storedFileLink(RAW);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await expect(openStoredFile(RAW)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(SIGNED, '_blank', 'noopener,noreferrer');
  });

  it('closes the tab and says so when the file is not available', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    mocks.post.mockRejectedValueOnce(apiError(404, 'file_not_found'));
    await expect(openStoredFile(RAW)).resolves.toBe(false);
    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.replace).not.toHaveBeenCalled();
  });

  it('closes the tab when the link cannot be had', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    mocks.post.mockRejectedValueOnce(apiError(500));
    await expect(openStoredFile({ key: 'tenants/t/documents/f1.pdf' })).rejects.toBeInstanceOf(ApiError);
    expect(tab.close).toHaveBeenCalled();
  });

  it('opens a file known by its key', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    signs();
    await expect(openStoredFile({ key: 'tenants/t/documents/f1.pdf' })).resolves.toBe(true);
    expect(tab.location.replace).toHaveBeenCalledWith(SIGNED);
  });

  it('opens the file in this tab when even the empty tab is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const assign = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });
    try {
      signs();
      await expect(openStoredFile(RAW)).resolves.toBe(true);
      expect(assign).toHaveBeenCalledWith(SIGNED);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    }
  });
});
