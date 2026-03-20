'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface Ticket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  unit_id: string | null;
  created_by: string;
  assigned_to: string | null;
  category: string;
  subject: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  sla_due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  author_name?: string;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateTicketInput {
  category: string;
  subject: string;
  description?: string;
  priority?: string;
  unit_id?: string;
}

interface UpdateTicketInput {
  id: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  category?: string;
}

interface AddCommentInput {
  ticket_id: string;
  message: string;
  is_internal?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters?: TicketFilters) => [...ticketKeys.lists(), filters] as const,
  myTickets: () => [...ticketKeys.all, 'my'] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
  categories: () => [...ticketKeys.all, 'categories'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: TicketFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;
  if (filters.category) params.category = filters.category;
  if (filters.assigned_to) params.assigned_to = filters.assigned_to;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: function fetchTickets() {
      return api.get<PaginatedResponse<Ticket>>('/tickets', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.myTickets(),
    queryFn: function fetchMyTickets() {
      return api.get<PaginatedResponse<Ticket>>('/tickets/my');
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: function fetchTicket() {
      return api
        .get<{ data: Ticket }>(`/tickets/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: function fetchTicketStats() {
      return api
        .get<{ data: TicketStats }>('/tickets/stats')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useTicketCategories() {
  return useQuery({
    queryKey: ticketKeys.categories(),
    queryFn: function fetchTicketCategories() {
      return api
        .get<{ data: string[] }>('/tickets/categories')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createTicket(input: CreateTicketInput) {
      return api.post<{ data: Ticket }>('/tickets', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateTicket({ id, ...body }: UpdateTicketInput) {
      return api.patch<{ data: Ticket }>(`/tickets/${id}`, body);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function addComment({ ticket_id, ...body }: AddCommentInput) {
      return api.post<{ data: TicketComment }>(
        `/tickets/${ticket_id}/comments`,
        body,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticket_id) });
    },
  });
}
