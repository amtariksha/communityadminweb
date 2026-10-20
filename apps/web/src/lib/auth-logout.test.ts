import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken, logout, setToken } from './auth';

/**
 * Every admin web sign-out (sidebar, classic top bar, super admin, no-access,
 * select-society, wrong-app) calls logout(), which must reach POST
 * /auth/logout — it revokes the refresh token and clears its cookie — even
 * though the page navigates away at once (`keepalive`).
 */
describe('logout', () => {
  const fetchMock = vi.fn();
  const replace = vi.fn();
  const realLocation = window.location;

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    replace.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, hostname: 'localhost', replace } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('asks the API to end the session in a request that outlives the navigation', () => {
    setToken('admin-access-token');
    localStorage.setItem('communityos_user', '{"id":"user-1"}');
    logout();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/auth\/logout$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', keepalive: true });
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('communityos_user')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/login');
  });
});
