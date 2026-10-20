'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * The admin Assistant (P3): GET /assistant/status, POST /assistant/ask and
 * PUT /assistant/settings. An API without the routes (before its deploy)
 * answers 404: the status then resolves to `null` and the panel and the
 * Settings card say "not available yet".
 */
export interface AssistantStatus {
  enabled: boolean;
  configured: boolean;
  can_change: boolean;
  limits: { per_hour: number; per_day: number };
}

export interface AssistantCitation {
  label: string;
  href: string;
}

export interface AssistantDuesCard {
  type: 'unit_dues';
  unit_number: string;
  block: string | null;
  current_due: number;
  current_advances: number;
  from: string;
  to: string;
  rows: Array<{ date: string; document: string; number: string | null; account: string | null; due: number; paid: number; balance: number }>;
  href: string;
}

/** A notice the Assistant proposes; nothing is saved until the person presses Save as draft. */
export interface AssistantDraftCard {
  type: 'announcement_draft';
  title: string;
  body: string;
  category: string;
}

export type AssistantCard = AssistantDuesCard | AssistantDraftCard;

export interface AssistantAnswer {
  reply: string;
  citations: AssistantCitation[];
  cards: AssistantCard[];
  tools: Array<{ name: string; status: string }>;
  configured: boolean;
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantScreen {
  path: string;
  href: string;
}

export interface AskAssistantInput {
  message: string;
  history: AssistantTurn[];
  screens: AssistantScreen[];
}

export const assistantStatusKey = ['assistant', 'status'] as const;

export function useAssistantStatus(enabled = true) {
  return useQuery({
    queryKey: assistantStatusKey,
    enabled,
    queryFn: async function fetchAssistantStatus(): Promise<AssistantStatus | null> {
      try {
        return (await api.get<{ data: AssistantStatus }>('/assistant/status')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: async function askAssistant(input: AskAssistantInput): Promise<AssistantAnswer> {
      return (await api.post<{ data: AssistantAnswer }>('/assistant/ask', input)).data;
    },
  });
}

export function useSaveAssistantSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveAssistantSettings(enabled: boolean) {
      return api.put<{ data: { enabled: boolean } }>('/assistant/settings', { enabled });
    },
    onSuccess: function forgetStatus() {
      void queryClient.invalidateQueries({ queryKey: assistantStatusKey });
    },
  });
}
