'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Resident Offers & Deals
// ---------------------------------------------------------------------------

export interface OfferItem {
  id: string;
  tenant_id: string;
  title: string;
  merchant_name: string;
  promo_code: string | null;
  discount_description: string | null;
  valid_until: string | null;
  terms: string | null;
  banner_url: string | null;
  status: 'active' | 'expired';
  created_at: string;
}

export interface CreateOfferInput {
  title: string;
  merchant_name: string;
  promo_code?: string | null;
  discount_description?: string | null;
  valid_until?: string | null;
  terms?: string | null;
  banner_url?: string | null;
  status?: 'active' | 'expired';
}

export interface UpdateOfferInput extends Partial<CreateOfferInput> {}

// ---------------------------------------------------------------------------
// Local Business Directory
// ---------------------------------------------------------------------------

export interface BusinessCategory {
  id: string;
  tenant_id: string;
  name: string;
  icon: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  listing_count?: number;
}

export interface BusinessListing {
  id: string;
  tenant_id: string;
  category_id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  working_hours: string | null;
  website: string | null;
  rating: number;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  created_at: string;
  category_name?: string;
  category_icon?: string | null;
}

export interface CreateBusinessCategoryInput {
  name: string;
  icon?: string | null;
  status?: 'active' | 'inactive';
}

export interface CreateBusinessListingInput {
  category_id: string;
  business_name: string;
  phone?: string | null;
  address?: string | null;
  working_hours?: string | null;
  website?: string | null;
  rating?: number;
  status?: 'active' | 'inactive' | 'pending' | 'rejected';
}

export interface UpdateBusinessListingInput extends Partial<CreateBusinessListingInput> {}

// ---------------------------------------------------------------------------
// Emergency Directory Contacts
// ---------------------------------------------------------------------------

export interface EmergencyContact {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  category: 'hospital' | 'police' | 'fire' | 'internal' | 'ambulance';
  address: string | null;
  available_24_7: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyContactInput {
  name: string;
  phone: string;
  category: 'hospital' | 'police' | 'fire' | 'internal' | 'ambulance';
  address?: string | null;
  available_24_7?: boolean;
}

export interface UpdateEmergencyContactInput extends Partial<CreateEmergencyContactInput> {}

// ---------------------------------------------------------------------------
// Amenity Rules & Club Membership Register
// ---------------------------------------------------------------------------

export interface AmenityRule {
  id: string;
  tenant_id: string;
  amenity_id: string;
  rule_text: string;
  display_order: number;
  created_at: string;
}

export interface ClubMember {
  id: string;
  tenant_id: string;
  member_id: string;
  membership_type: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  applied_at: string;
  approved_at?: string | null;
  valid_until?: string | null;
  monthly_fee: number;
  member_name?: string;
  member_phone?: string;
  unit_number?: string;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const lifestyleKeys = {
  offers: {
    all: ['lifestyle', 'offers'] as const,
    list: (status?: string) => [...lifestyleKeys.offers.all, status] as const,
  },
  businessCategories: {
    all: ['lifestyle', 'business-categories'] as const,
  },
  businessListings: {
    all: ['lifestyle', 'business-listings'] as const,
    list: (filters: { category_id?: string; status?: string; search?: string }) =>
      [...lifestyleKeys.businessListings.all, filters] as const,
  },
  emergencyContacts: {
    all: ['lifestyle', 'emergency-contacts'] as const,
    list: (category?: string) => [...lifestyleKeys.emergencyContacts.all, category] as const,
  },
  amenityRules: {
    all: ['amenities', 'rules'] as const,
    list: (amenityId: string) => [...lifestyleKeys.amenityRules.all, amenityId] as const,
  },
  clubMembers: {
    all: ['amenities', 'club-members'] as const,
    list: (status?: string) => [...lifestyleKeys.clubMembers.all, status] as const,
  },
};

// ---------------------------------------------------------------------------
// Offers Hooks
// ---------------------------------------------------------------------------

export function useOffers(status?: string) {
  return useQuery({
    queryKey: lifestyleKeys.offers.list(status),
    queryFn: async () => {
      const qs = status && status !== 'all' ? `?status=${status}` : '';
      const response = await api.get<{ data: OfferItem[] }>(`/offers${qs}`);
      return response.data;
    },
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOfferInput) => {
      const response = await api.post<{ data: OfferItem }>('/offers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.offers.all });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOfferInput }) => {
      const response = await api.patch<{ data: OfferItem }>(`/offers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.offers.all });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ data: { success: boolean } }>(`/offers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.offers.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Business Directory Hooks
// ---------------------------------------------------------------------------

export function useBusinessCategories() {
  return useQuery({
    queryKey: lifestyleKeys.businessCategories.all,
    queryFn: async () => {
      const response = await api.get<{ data: BusinessCategory[] }>(
        '/directory/business-categories',
      );
      return response.data;
    },
  });
}

export function useCreateBusinessCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBusinessCategoryInput) => {
      const response = await api.post<{ data: BusinessCategory }>(
        '/directory/business-categories',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.businessCategories.all });
    },
  });
}

export function useBusinessListings(categoryId?: string, status?: string, search?: string) {
  return useQuery({
    queryKey: lifestyleKeys.businessListings.list({
      category_id: categoryId,
      status,
      search,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId && categoryId !== 'all') params.append('category_id', categoryId);
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<{ data: BusinessListing[] }>(
        `/directory/business-listings${qs}`,
      );
      return response.data;
    },
  });
}

export function useCreateBusinessListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBusinessListingInput) => {
      const response = await api.post<{ data: BusinessListing }>(
        '/directory/business-listings',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.businessListings.all });
    },
  });
}

export function useUpdateBusinessListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBusinessListingInput }) => {
      const response = await api.patch<{ data: BusinessListing }>(
        `/directory/business-listings/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.businessListings.all });
    },
  });
}

export function useDeleteBusinessListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ data: { success: boolean } }>(
        `/directory/business-listings/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.businessListings.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Emergency Contacts Directory Hooks
// ---------------------------------------------------------------------------

export function useEmergencyContacts(category?: string) {
  return useQuery({
    queryKey: lifestyleKeys.emergencyContacts.list(category),
    queryFn: async () => {
      const qs = category && category !== 'all' ? `?category=${category}` : '';
      const response = await api.get<{ data: EmergencyContact[] }>(
        `/directory/emergency-contacts${qs}`,
      );
      return response.data;
    },
  });
}

export function useCreateEmergencyContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEmergencyContactInput) => {
      const response = await api.post<{ data: EmergencyContact }>(
        '/directory/emergency-contacts',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.emergencyContacts.all });
    },
  });
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmergencyContactInput }) => {
      const response = await api.patch<{ data: EmergencyContact }>(
        `/directory/emergency-contacts/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.emergencyContacts.all });
    },
  });
}

export function useDeleteEmergencyContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ data: { success: boolean } }>(
        `/directory/emergency-contacts/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.emergencyContacts.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Amenity Rules & Club Members Hooks
// ---------------------------------------------------------------------------

export function useAmenityRules(amenityId: string) {
  return useQuery({
    queryKey: lifestyleKeys.amenityRules.list(amenityId),
    queryFn: async () => {
      const response = await api.get<{ data: AmenityRule[] }>(
        `/amenities/${amenityId}/rules`,
      );
      return response.data;
    },
    enabled: !!amenityId,
  });
}

export function useCreateAmenityRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amenityId,
      ruleText,
      displayOrder,
    }: {
      amenityId: string;
      ruleText: string;
      displayOrder?: number;
    }) => {
      const response = await api.post<{ data: AmenityRule }>(
        `/amenities/${amenityId}/rules`,
        { rule_text: ruleText, display_order: displayOrder ?? 0 },
      );
      return response.data;
    },
    onSuccess: (_, { amenityId }) => {
      queryClient.invalidateQueries({
        queryKey: lifestyleKeys.amenityRules.list(amenityId),
      });
    },
  });
}

export function useDeleteAmenityRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amenityId,
      ruleId,
    }: {
      amenityId: string;
      ruleId: string;
    }) => {
      const response = await api.delete<{ data: { success: boolean } }>(
        `/amenities/rules/${ruleId}`,
      );
      return response.data;
    },
    onSuccess: (_, { amenityId }) => {
      queryClient.invalidateQueries({
        queryKey: lifestyleKeys.amenityRules.list(amenityId),
      });
    },
  });
}

export function useClubMembers(status?: string) {
  return useQuery({
    queryKey: lifestyleKeys.clubMembers.list(status),
    queryFn: async () => {
      const qs = status && status !== 'all' ? `?status=${status}` : '';
      const response = await api.get<{ data: ClubMember[] }>(
        `/amenities/club/members${qs}`,
      );
      return response.data;
    },
  });
}

export function useCreateClubMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      member_id: string;
      membership_type: string;
      monthly_fee?: number;
      valid_until?: string;
    }) => {
      const response = await api.post<{ data: ClubMember }>(
        '/amenities/club/members',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.clubMembers.all });
    },
  });
}

export function useUpdateClubMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'active' | 'expired' | 'rejected';
    }) => {
      const response = await api.patch<{ data: ClubMember }>(
        `/amenities/club/members/${id}/status`,
        { status },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifestyleKeys.clubMembers.all });
    },
  });
}
