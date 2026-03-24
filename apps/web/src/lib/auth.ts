const TOKEN_KEY = 'communityos_token';
const TENANT_KEY = 'communityos_tenant';
const USER_KEY = 'communityos_user';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isSuperAdmin: boolean;
  role: string;
  societies: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function getCurrentTenant(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TENANT_KEY);
}

export function setCurrentTenant(tenantId: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearCurrentTenant(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TENANT_KEY);
}

export function getUser(): User | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout(): void {
  if (!isBrowser()) return;
  // Clear all auth-related storage
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('refresh_token');
  // Force full page navigation to clear any cached state
  window.location.replace('/login');
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
