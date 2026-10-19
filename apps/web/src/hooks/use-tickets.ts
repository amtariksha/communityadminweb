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

/** Requests in each HelpDesk list for this user (HELP-12); older servers send none. */
export interface TicketScopeCounts {
  open: number;
  closed: number;
}

export interface TicketListResponse extends PaginatedResponse<Ticket> {
  counts?: TicketScopeCounts;
}

export type TicketScopeName = keyof TicketScopeCounts;

/** One filter option with the number of requests behind it. */
export interface TicketFacetOption {
  value: string | null;
  label: string;
  count: number;
}

/** "name (n)" counts of the list filters, inside one scope (GET /tickets/facets). */
export interface TicketFacets {
  status: TicketFacetOption[];
  category: TicketFacetOption[];
  driven_by: TicketFacetOption[];
  block: TicketFacetOption[];
  unit: TicketFacetOption[];
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
  status: 'open' | 'in_progress' | 'on_hold' | 'awaiting_resident' | 'resolved' | 'closed' | 'reopened';
  sla_due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // QA #231 — single optional attachment per ticket. Both populated
  // together or both null.
  attachment_url?: string | null;
  attachment_name?: string | null;
  category_id?: string | null;
  // Returned by the list and detail routes.
  is_overdue?: boolean;
  unit_number?: string | null;
  created_by_name?: string | null;
  assigned_to_name?: string | null;
  // List rows (HELP-12): the unit's block, the newest comment of either
  // thread and whole days open (to closing, once completed).
  block?: string | null;
  last_comment_text?: string | null;
  last_comment_at?: string | null;
  age_days?: number | null;
  attachment_urls?: string[];
  attachment_names?: string[];
  // GET /tickets/:id returns the whole thread; the list does not.
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  // Null for system comments (escalation, automatic replies).
  author_id: string | null;
  message: string;
  is_internal: boolean;
  is_system?: boolean;
  created_at: string;
  author_name?: string;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  // HELP-14; older servers do not send them.
  on_hold?: number;
  awaiting_resident?: number;
  resolved: number;
  closed: number;
  total?: number;
  overdue?: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface TicketFilters {
  /** Open Requests or Closed Requests (HELP-12). */
  scope?: TicketScopeName;
  /** Request number, subject, text, unit number or raiser's name. */
  q?: string;
  /** A block, or 'none'. */
  block?: string;
  /** A unit id, or 'none'. */
  unit_id?: string;
  status?: string;
  priority?: string;
  category?: string;
  category_id?: string;
  /** A Driven By user id, or 'unassigned'. */
  assigned_to?: string;
  /** Only requests past their due time and not completed. */
  overdue?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateTicketInput {
  // The society's category id; `category` (a name) is still accepted.
  category_id?: string;
  category?: string;
  subject: string;
  description?: string;
  priority?: string;
  unit_id?: string;
  // QA #231 — populated by useUploadFileToS3 in the consumer page.
  // Backend rejects partial payloads (refine: both or neither).
  attachment_url?: string;
  attachment_name?: string;
}

interface UpdateTicketInput {
  id: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  category_id?: string;
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
  facets: (scope: TicketScopeName) => [...ticketKeys.all, 'facets', scope] as const,
  scopeCounts: () => [...ticketKeys.all, 'scope-counts'] as const,
  categories: () => [...ticketKeys.all, 'categories'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: TicketFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.scope) params.scope = filters.scope;
  if (filters.q) params.q = filters.q;
  if (filters.block) params.block = filters.block;
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;
  if (filters.category) params.category = filters.category;
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.assigned_to) params.assigned_to = filters.assigned_to;
  if (filters.overdue) params.overdue = 'true';
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  if (filters.sort) params.sort = filters.sort;
  if (filters.dir) params.dir = filters.dir;
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: function fetchTickets() {
      return api.get<TicketListResponse>('/tickets', {
        params: filtersToParams(filters),
      });
    },
  });
}

/** The query string of the list for these filters, as its export takes it. */
export function ticketListParams(filters: TicketFilters): Record<string, string> {
  const { page: _page, limit: _limit, ...rest } = filters;
  return filtersToParams(rest) ?? {};
}

/** Filter counts of Open Requests or Closed Requests (HELP-12). */
export function useTicketFacets(scope: TicketScopeName) {
  return useQuery({
    queryKey: ticketKeys.facets(scope),
    queryFn: function fetchTicketFacets() {
      return api
        .get<{ data: TicketFacets }>('/tickets/facets', { params: { scope } })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

/**
 * How many requests Open Requests and Closed Requests hold, for the
 * counts in the classic menu (SB-05). Undefined until a server that
 * counts them answers.
 */
export function useTicketScopeCounts(enabled: boolean) {
  return useQuery({
    queryKey: ticketKeys.scopeCounts(),
    queryFn: function fetchTicketScopeCounts() {
      return api
        .get<TicketListResponse>('/tickets', { params: { limit: '1' } })
        .then(function unwrap(res) {
          return res.counts ?? null;
        });
    },
    enabled,
    staleTime: 60_000,
    retry: false,
    // A count beside a menu entry is never worth an error toast.
    meta: { suppressToast: true },
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

/** A status or owner change moves requests between lists and their counts. */
function invalidateTicketLists(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
  queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
  queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, 'facets'] });
  queryClient.invalidateQueries({ queryKey: ticketKeys.scopeCounts() });
}

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
      invalidateTicketLists(queryClient);
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

export function useBulkCloseTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkClose(input: {
      ticket_ids: string[];
      resolution_note?: string;
    }) {
      return api.post<{ data: { closed: number } }>(
        '/tickets/bulk/close',
        input,
      );
    },
    onSuccess: function invalidate() {
      invalidateTicketLists(queryClient);
    },
  });
}

export function useBulkReassignTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkReassign(input: {
      ticket_ids: string[];
      assigned_to: string;
    }) {
      return api.post<{ data: { reassigned: number } }>(
        '/tickets/bulk/reassign',
        input,
      );
    },
    onSuccess: function invalidate() {
      invalidateTicketLists(queryClient);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpdesk Hooks & Extended Types
// ---------------------------------------------------------------------------

export interface HelpdeskKpi {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  on_hold_tickets?: number;
  awaiting_resident_tickets?: number;
  resolved_tickets: number;
  closed_tickets: number;
  sla_breached: number;
  avg_resolution_hours: number;
}

export interface HelpdeskTemplate {
  id: string;
  title: string;
  subject: string | null;
  body: string;
  category_id: string | null;
}

export function useHelpdeskKpi() {
  return useQuery({
    queryKey: ['helpdesk', 'kpi'],
    queryFn: async () => {
      const res = await api.get<{ data: HelpdeskKpi }>('/helpdesk/kpi');
      return res.data;
    },
  });
}

export function useHelpdeskSetup() {
  return useQuery({
    queryKey: ['helpdesk', 'setup'],
    queryFn: async () => {
      const res = await api.get<{
        data: {
          settings: {
            operational_days: string[];
            operational_hours_start: string;
            operational_hours_end: string;
            allowed_modes: string[];
            aging_sla_hours: number;
            committee_emails: string[];
          };
          categories: Array<{ id: string; name: string; sla_hours: number; default_priority: string }>;
          statuses: Array<{ id: string; label: string; category: string; color: string }>;
        };
      }>('/helpdesk/setup');
      return res.data;
    },
  });
}

export function useHelpdeskTemplates() {
  return useQuery({
    queryKey: ['helpdesk', 'templates'],
    queryFn: async () => {
      const res = await api.get<{ data: HelpdeskTemplate[] }>('/helpdesk/templates');
      return res.data;
    },
  });
}

export function useCreateHelpdeskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; subject?: string; body: string; category_id?: string }) =>
      api.post<{ data: HelpdeskTemplate }>('/helpdesk/templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['helpdesk', 'templates'] }),
  });
}

