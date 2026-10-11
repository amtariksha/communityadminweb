'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  getToken,
  getUser,
  setToken,
  setUser,
  setCurrentTenant,
} from '@/lib/auth';
import type { User } from '@/lib/auth';
import { pickAdminRole, NON_ADMIN_ROLE_SENTINEL } from '@/lib/admin-roles';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface SendOtpResponse {
  message: string;
}

interface TenantInfo {
  tenantId: string;
  tenantName: string;
  roles: string[];
  // White-label runtime branding (backend migration 099). Sent on every
  // tenant entry by /auth/me and /auth/verify-otp; optional for
  // back-compat with backends that predate it.
  logo_url?: string | null;
  display_name?: string | null;
}

/**
 * The ONE place an API tenant entry becomes a `User['societies']` entry.
 * /auth/me and /auth/verify-otp both go through it: they used to carry
 * hand-copied mappers, and both silently dropped `logo_url` /
 * `display_name`, so per-society branding never reached the sidebar.
 */
export function toSociety(t: TenantInfo): User['societies'][number] {
  return {
    id: t.tenantId,
    name: t.tenantName,
    // Admin-eligible role for this society. If the user only has resident
    // roles here, mark it with NON_ADMIN_ROLE_SENTINEL so the entry is
    // uniformly rejected by getAdminSocieties, getSidebarAllowlist and
    // bootstrap re-validation. A `t.roles[0]` fallback would leak the
    // resident slug and widen the admin sidebar (multi-role bug,
    // 2026-04-29).
    role: pickAdminRole(t.roles) ?? NON_ADMIN_ROLE_SENTINEL,
    logo_url: t.logo_url ?? null,
    display_name: t.display_name ?? null,
  };
}

interface VerifyOtpResponse {
  // QA #57 — refresh token now ships as an httpOnly cookie. The JSON
  // response carries only the short-lived access token the SPA needs
  // to sign Authorization Bearer headers.
  access_token: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    isSuperAdmin: boolean;
    tenants: TenantInfo[];
    // QA Round 14 #14-1d/e — set of apps this user can sign into,
    // computed server-side from the per-society role allowlist.
    // Used by the admin web to short-circuit "wrong app" routing
    // (#14-2d) without a second round-trip. Always present on
    // current backend; typed optional for back-compat with stale
    // dev environments where the field hasn't deployed yet.
    accessible_apps?: Array<'admin' | 'resident' | 'guard'>;
  };
}

interface RefreshTokenResponse {
  access_token: string;
}

interface SwitchTenantResponse {
  token: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface SendOtpInput {
  phone: string;
}

interface VerifyOtpInput {
  phone: string;
  otp: string;
}

interface SwitchTenantInput {
  tenant_id: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const authKeys = {
  me: ['auth', 'me'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

interface MeResponse {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  tenants: TenantInfo[];
  // QA Round 14 #14-1d — same field as on the verify-otp response.
  // The dashboard layout's bootstrap can read this to enforce the
  // wrong-app block on a stale session that survives a token
  // refresh. Optional for back-compat with deployed-but-not-yet
  // backends.
  accessible_apps?: Array<'admin' | 'resident' | 'guard'>;
}

export function useCurrentUser() {
  const token = getToken();

  return useQuery({
    queryKey: authKeys.me,
    queryFn: function fetchMe() {
      return api.get<MeResponse>('/auth/me').then(function mapToUser(res): User {
        // Same admin-eligible role picker as useVerifyOtp — both
        // entry points must agree, otherwise the next /auth/me poll
        // would silently overwrite the corrected localStorage with
        // the buggy first-role-wins shape.
        return {
          id: res.id,
          phone: res.phone,
          name: res.name ?? '',
          email: res.email ?? undefined,
          isSuperAdmin: res.isSuperAdmin,
          role: res.isSuperAdmin
            ? 'super_admin'
            : (pickAdminRole(res.tenants.flatMap((t) => t.roles)) ?? 'user'),
          societies: res.tenants.map(toSociety),
          // QA Round 14 #14-2e — see useVerifyOtp comment.
          accessible_apps: res.accessible_apps,
        };
      });
    },
    enabled: token !== null,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useSendOtp() {
  return useMutation({
    mutationFn: function sendOtp(input: SendOtpInput) {
      return api.post<SendOtpResponse>('/auth/send-otp', input);
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function verifyOtp(input: VerifyOtpInput) {
      return api.post<VerifyOtpResponse>('/auth/verify-otp', input);
    },
    onSuccess: function persistSession(data) {
      setToken(data.access_token);
      // Refresh token lives in an httpOnly cookie set by the backend —
      // JS never sees it (QA #57). Nothing to persist here.

      // Map API response to the User shape stored in localStorage.
      //
      // BUG FIX (2026-04-25): the previous mapping picked
      // `tenants[0].roles[0]` blindly. A user added as community_admin
      // to Tenant B who is also a tenant_resident at Tenant A would
      // see "tenant_resident" in the admin sidebar — wrong, plus
      // confusing because resident roles do not grant admin access.
      // `pickAdminRole` picks the highest-priority admin-eligible
      // role; per-society we do the same so the tenant-switcher and
      // sidebar gating use the user's *admin* role in each society,
      // not whatever happened to be first.
      const societies = data.user.tenants.map(toSociety);
      const user: User = {
        id: data.user.id,
        phone: data.user.phone,
        name: data.user.name ?? '',
        email: data.user.email ?? undefined,
        isSuperAdmin: data.user.isSuperAdmin,
        role: data.user.isSuperAdmin
          ? 'super_admin'
          : (pickAdminRole(data.user.tenants.flatMap((t) => t.roles)) ?? 'user'),
        societies,
        // QA Round 14 #14-2e — persist the server-computed access set
        // so the dashboard layout's bootstrap can reapply the
        // wrong-app block on every reload (not just at login time).
        accessible_apps: data.user.accessible_apps,
      };
      setUser(user);

      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: function refreshToken() {
      return api.post<RefreshTokenResponse>('/auth/refresh');
    },
    onSuccess: function persistToken(data) {
      setToken(data.access_token);
      // Cookie rotation is handled by the backend — no JS state to update.
    },
  });
}

export function useSwitchTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function switchTenant(input: SwitchTenantInput) {
      return api.post<SwitchTenantResponse>('/auth/switch-tenant', input);
    },
    onSuccess: function persistTenant(data, variables) {
      setToken(data.token);
      setCurrentTenant(variables.tenant_id);
      // QA #51 — invalidate would leave old data visible while
      // refetching (the "flash"). clear() drops cached results so
      // consumers render loading states until new data arrives,
      // preventing any cross-tenant display leak.
      queryClient.clear();
    },
  });
}
