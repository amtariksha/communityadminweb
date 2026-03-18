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
  access_token: string;
  refresh_token: string;
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
  refresh_token: string;
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
        return {
          id: res.id,
          phone: res.phone,
          name: res.name ?? '',
          email: res.email ?? undefined,
          isSuperAdmin: res.isSuperAdmin,
          role: res.isSuperAdmin
            ? 'super_admin'
            : (res.tenants[0]?.roles[0] ?? 'user'),
          societies: res.tenants.map((t) => ({
            id: t.tenantId,
            name: t.tenantName,
            role: t.roles[0] ?? 'member',
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

      // Map API response to the User shape stored in localStorage
      const user: User = {
        id: data.user.id,
        phone: data.user.phone,
        name: data.user.name ?? '',
        email: data.user.email ?? undefined,
        isSuperAdmin: data.user.isSuperAdmin,
        role: data.user.isSuperAdmin
          ? 'super_admin'
          : (data.user.tenants[0]?.roles[0] ?? 'user'),
        societies: data.user.tenants.map((t) => ({
          id: t.tenantId,
          name: t.tenantName,
          role: t.roles[0] ?? 'member',
        })),
      };
      setUser(user);

      const firstTenant = data.user.tenants[0];
      if (firstTenant) {
        setCurrentTenant(firstTenant.tenantId);
      }

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
      queryClient.invalidateQueries();
    },
  });
}
