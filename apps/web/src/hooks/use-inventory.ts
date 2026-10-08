'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Material {
  id: string;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
  location: string | null;
  created_at: string;
}

export interface LOI {
  id: string;
  loi_number: string;
  vendor: string;
  title: string;
  estimated_value: number;
  valid_until: string | null;
  status: 'draft' | 'issued' | 'converted' | 'expired';
  deliverables: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string | null;
  vendor_name: string;
  total_amount: number;
  tax_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  po_date: string;
  delivery_date: string | null;
  notes: string | null;
}

export interface GRN {
  id: string;
  grn_number: string;
  po_id: string | null;
  vendor_name: string;
  received_by: string;
  received_date: string;
  items_count: number;
  invoice_number: string | null;
  status: 'received' | 'inspected' | 'rejected';
  notes: string | null;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  title: string;
  category: string;
  assigned_to: string | null;
  materials_used: number;
  cost: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  wo_date: string;
}

export interface StockLog {
  id: string;
  material_id: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  balance: number;
  log_date: string;
  notes: string | null;
  material_name?: string;
  item_code?: string;
  created_at: string;
}

export function useMaterials(category?: string) {
  return useQuery({
    queryKey: ['inventory', 'materials', category],
    queryFn: async () => {
      const url = category && category !== 'all' ? `/inventory/materials?category=${category}` : '/inventory/materials';
      const res = await api.get<{ data: Material[] }>(url);
      return res.data;
    },
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Material>) => api.post<{ data: Material }>('/inventory/materials', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'materials'] }),
  });
}

export function useLOIs() {
  return useQuery({
    queryKey: ['inventory', 'loi'],
    queryFn: async () => {
      const res = await api.get<{ data: LOI[] }>('/inventory/loi');
      return res.data;
    },
  });
}

export function useCreateLOI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LOI>) => api.post<{ data: LOI }>('/inventory/loi', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'loi'] }),
  });
}

export function useConvertLOIToPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loiId: string) => api.post<{ success: boolean; po_id: string; po_number: string }>(`/inventory/loi/${loiId}/convert-to-po`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'loi'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}

export function useInventoryPurchaseOrders() {
  return useQuery({
    queryKey: ['inventory', 'purchase-orders'],
    queryFn: async () => {
      const res = await api.get<{ data: PurchaseOrder[] }>('/inventory/purchase-orders');
      return res.data;
    },
  });
}

export function useCreateInventoryPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PurchaseOrder>) => api.post<{ data: PurchaseOrder }>('/inventory/purchase-orders', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] }),
  });
}

export function useGRNs() {
  return useQuery({
    queryKey: ['inventory', 'grn'],
    queryFn: async () => {
      const res = await api.get<{ data: GRN[] }>('/inventory/grn');
      return res.data;
    },
  });
}

export function useCreateGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<GRN>) => api.post<{ data: GRN }>('/inventory/grn', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'grn'] }),
  });
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ['inventory', 'work-orders'],
    queryFn: async () => {
      const res = await api.get<{ data: WorkOrder[] }>('/inventory/work-orders');
      return res.data;
    },
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkOrder>) => api.post<{ data: WorkOrder }>('/inventory/work-orders', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', 'work-orders'] }),
  });
}

export function useStockLogs(materialId?: string) {
  return useQuery({
    queryKey: ['inventory', 'stock-logs', materialId],
    queryFn: async () => {
      const url = materialId ? `/inventory/stock-logs?materialId=${materialId}` : '/inventory/stock-logs';
      const res = await api.get<{ data: StockLog[] }>(url);
      return res.data;
    },
  });
}

export function useRecordStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { material_id: string; movement_type: 'IN' | 'OUT'; quantity: number; notes?: string }) =>
      api.post<{ data: StockLog }>('/inventory/stock-logs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'stock-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'materials'] });
    },
  });
}
