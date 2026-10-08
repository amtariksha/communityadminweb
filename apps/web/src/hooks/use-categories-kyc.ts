'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MemberCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  member_count?: number;
}

export interface KycRecord {
  id: string;
  member_id: string;
  status: 'pending' | 'verified' | 'approved' | 'rejected';
  id_type: string;
  id_number: string;
  document_url: string;
  submitted_at: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  member_email?: string | null;
  member_type?: string | null;
  unit_number?: string | null;
  verifier_name?: string | null;
}

export function useMemberCategories() {
  return useQuery({
    queryKey: ['member-categories'],
    queryFn: async () => {
      const res = await api.get<{ data: MemberCategory[] }>('/member-categories');
      return res.data;
    },
  });
}

export function useCreateMemberCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      api.post<{ data: MemberCategory }>('/member-categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member-categories'] }),
  });
}

export function useDeleteMemberCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/member-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member-categories'] }),
  });
}

export function useKycRecords(status?: string, search?: string) {
  return useQuery({
    queryKey: ['kyc-records', status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<{ data: KycRecord[] }>(`/kyc${q}`);
      return res.data;
    },
  });
}

export function useVerifyKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.post<{ data: KycRecord }>(`/kyc/${id}/verify`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-records'] }),
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<{ data: KycRecord }>(`/kyc/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-records'] }),
  });
}
