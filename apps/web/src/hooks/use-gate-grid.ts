'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { gateConfigKeys, type Gate } from './use-staff';

/** A row of PUT /gate/gates/bulk (GATE-20, SB-08): the whole list; a retired gate is `is_active: false`. */
export interface GateGridRow {
  id?: string;
  name: string;
  location: string | null;
  gate_type: string;
  allows_entry: boolean;
  allows_exit: boolean;
  is_active: boolean;
}

/** Gate & Visitors › Setup › Gates: saves every row in one request; answers every gate. */
export function useSaveGateGrid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveGateGrid(rows: GateGridRow[]) {
      return api.put<{ data: Gate[] }>('/gate/gates/bulk', { rows });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateConfigKeys.gates() });
    },
  });
}

/** "In & Out", "In only" or "Out only" (an older API sends neither flag: both). */
export function gateDirectionLabel(gate: Pick<Gate, 'allows_entry' | 'allows_exit'>): string {
  const entry = gate.allows_entry !== false;
  const exit = gate.allows_exit !== false;
  if (entry && exit) return 'In & Out';
  if (entry) return 'In only';
  if (exit) return 'Out only';
  return 'Neither';
}
