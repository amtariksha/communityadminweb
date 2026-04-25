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
import { pickAdminRole } from '@/lib/admin-roles';

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
          societies: res.tenants.map((t) => ({
            id: t.tenantId,
            name: t.tenantName,
            role: pickAdminRole(t.roles) ?? t.roles[0] ?? 'member',
          })),
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
      const societies = data.user.tenants.map((t) => ({
        id: t.tenantId,
        name: t.tenantName,
        // Admin-eligible role for this society. If the user only has
        // resident roles here, fall back to the first role so the
        // entry isn't blank — but `getAdminSocieties()` will filter
        // it out of admin-only UI.
        role: pickAdminRole(t.roles) ?? t.roles[0] ?? 'member',
      }));
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
