import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentTenant } from '@/lib/auth';
import { saveUnlock, type UnlockScope } from '@/lib/gate-unlock';
import { orNullOn404 } from './use-gate-lists';

/** Asks for the one-time code (GATE-43); answers where it went and when it may be asked again. */
export function useRequestUnlockCode() {
  return useMutation({
    mutationFn: async function requestUnlockCode(scope: UnlockScope) {
      const res = await api.post<{ data: { sent_to: string; resend_after_seconds: number } }>('/gate/investigator/unlock', { scope });
      return res.data;
    },
  });
}

/** Sends the code back; a right one opens the scope for 15 minutes and reloads the gate lists. */
export function useVerifyUnlockCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async function verifyUnlockCode(input: { scope: UnlockScope; code: string }) {
      const res = await api.post<{ data: { unlock_token: string; expires_at: string } }>('/gate/investigator/unlock/verify', input);
      return { scope: input.scope, ...res.data };
    },
    onSuccess(result) {
      saveUnlock(result.scope, result.unlock_token, result.expires_at);
      queryClient.invalidateQueries({ queryKey: ['gate'] });
    },
  });
}

/** A row of the investigator access log (GATE-S9). */
export interface AccessLogRow {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  scope: UnlockScope;
  action: 'unlocked' | 'viewed' | 'exported';
  filters: Record<string, unknown>;
  row_count: number | null;
}

/** One page of the access log; null against an API without it (404). */
export function useAccessLog(page: number, limit: number) {
  const tenantId = getCurrentTenant() ?? '';
  return useQuery({
    queryKey: ['gate-access-log', tenantId, page, limit] as const,
    enabled: tenantId !== '',
    queryFn: () =>
      orNullOn404(() =>
        api.get<{ data: AccessLogRow[]; total: number }>('/gate/investigator/access-log', {
          params: { page: String(page), limit: String(limit) },
        }),
      ),
  });
}
