'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Vendor } from '@communityos/shared';
import { useApproverGrid } from '@/hooks/use-approver-grid';
import { useExpenseHeadsSummary, usePurchaseRequestDetail, type ExpenseHeadSummary } from '@/hooks/use-purchase-requests';
import { useVendors } from '@/hooks/use-vendors';
import { getUser } from '@/lib/auth';
import { defaultGstType, ratesFor } from '@/lib/gst-lines';
import { emptyLine, levelChoices, valuesFromDetail, type LevelChoice, type LineValues, type RequestValues } from './request-state';
import { todayIST } from '@/lib/date';

export type VendorFacts = Vendor & { state_code?: string | null };

export function todayIst(): string {
  return todayIST();
}

const BLANK: RequestValues = { title: '', vendor_id: '', request_date: '', details: '', lines: [], levels: [] };

/**
 * The data and state behind the purchase request form (EXP-08): expense
 * heads with the GST facts, active vendors, the SB-11 grid's approvers,
 * and the stored request when one is opened.
 */
export function useRequestForm(requestId: string | null | undefined) {
  const me = getUser()?.id ?? null;
  const heads = useExpenseHeadsSummary();
  const vendors = useVendors({ is_active: true, limit: 100 });
  const grid = useApproverGrid('purchase_request');
  const detail = usePurchaseRequestDetail(requestId ?? null);
  const [values, setValues] = useState<RequestValues>(() => ({ ...BLANK, request_date: todayIst() }));
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const stored = detail.data ?? null;
  const editable = !requestId || (stored?.purchase_request.status === 'draft' && stored.purchase_request.requested_by === me);

  useEffect(() => {
    if (!stored || loadedId === stored.purchase_request.id) return;
    setLoadedId(stored.purchase_request.id);
    setValues((current) => ({ ...current, ...valuesFromDetail(stored) }));
  }, [stored, loadedId]);

  useEffect(() => {
    if (grid.data === undefined) return;
    setValues((current) => (current.levels.length > 0 ? current : { ...current, levels: levelChoices(grid.data, me) }));
  }, [grid.data, me]);

  const vendorList = (vendors.data?.data ?? []) as VendorFacts[];
  const vendor = vendorList.find((entry) => entry.id === values.vendor_id) ?? null;
  const gstType = defaultGstType(heads.data?.gst.society_state_code ?? null, vendor);
  const rates = useMemo(() => ratesFor(heads.data?.gst, values.request_date), [heads.data, values.request_date]);

  function setField<K extends keyof RequestValues>(key: K, value: RequestValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }
  function addHead(head: ExpenseHeadSummary): void {
    const line = { ...emptyLine(gstType), ledger_account_id: head.ledger_account_id, hsn_sac: head.hsn_sac ?? '' };
    setValues((current) => ({ ...current, lines: [...current.lines, line] }));
  }
  function changeLine(key: number, changes: Partial<LineValues>): void {
    setValues((current) => ({ ...current, lines: current.lines.map((line) => (line.key === key ? { ...line, ...changes } : line)) }));
  }
  function removeLine(key: number): void {
    setValues((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }));
  }
  function changeLevel(level: number, changes: Partial<LevelChoice>): void {
    setValues((current) => ({
      ...current,
      levels: current.levels.map((entry) => (entry.level === level ? { ...entry, ...changes } : entry)),
    }));
  }

  return {
    me,
    heads,
    vendors: vendorList,
    detail,
    stored,
    editable,
    values,
    rates,
    setField,
    addHead,
    changeLine,
    removeLine,
    changeLevel,
  };
}
