'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { bankKeys } from './use-bank';

/** GET /bank/setup (BANK-17). */
export interface BankSetupSettings {
  bank_pg_auto_reconcile: boolean;
  bank_pg_settlement_account_id: string | null;
  bank_reconcile_blocked_user_ids: string[];
}

export interface BankSetupScreen {
  accounting_start_date: string | null;
  settings: BankSetupSettings;
  accounts: Array<{ id: string; gl_no: string | null; account_name: string; type: 'Bank' | 'Petty Cash'; opening_balance: string; opening_balance_date: string | null }>;
  admin_users: Array<{ user_id: string; name: string | null; roles: string[] }>;
}

const setupKey = () => [...bankKeys.all, 'setup'] as const;

/** null on an API older than BANK-17 (the page says not available yet). */
export function useBankSetup() {
  return useQuery({
    queryKey: setupKey(),
    queryFn: async (): Promise<BankSetupScreen | null> => {
      try {
        return (await api.get<{ data: BankSetupScreen }>('/bank/setup')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useSaveBankSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: BankSetupSettings) => api.put<{ data: BankSetupScreen }>('/bank/setup', settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: setupKey() }),
  });
}
