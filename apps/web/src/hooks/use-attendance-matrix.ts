'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { staffKeys } from './use-staff';
import type { RegisterSearchKey, StaffKind } from './use-staff-register';

/**
 * Staff Manager › Attendance's matrix (STAFF-44): GET
 * /staff/attendance/matrix for a range of at most 62 days. Each cell is P
 * (present), L (late), LV (approved leave) or blank, with the hours of the
 * closed sessions; with `times` the first in and last out (India time).
 */

export const MATRIX_MAX_DAYS = 62;

export type AttendanceMark = 'P' | 'L' | 'LV' | '';

export interface AttendanceCell {
  mark: AttendanceMark;
  hours: number;
  first_in?: string | null;
  last_out?: string | null;
}

export interface AttendanceMatrixRow {
  kind: StaffKind;
  id: string;
  badge_no: string | null;
  name: string;
  category_name: string;
  cells: AttendanceCell[];
  total_hours: number;
}

export interface AttendanceMatrixQuery {
  from: string;
  to: string;
  q?: string;
  by?: RegisterSearchKey;
  times: boolean;
}

export interface AttendanceMatrixPage {
  days: string[];
  data: AttendanceMatrixRow[];
  total: number;
}

/** The query string of the matrix and its export. */
export function matrixParams(query: AttendanceMatrixQuery): Record<string, string> {
  const params: Record<string, string> = { from: query.from, to: query.to };
  if (query.q) params.q = query.q;
  if (query.q && query.by && query.by !== 'any') params.by = query.by;
  if (query.times) params.times = 'true';
  return params;
}

/** How many days the range holds (both ends included); 0 when it is not a range. */
export function rangeDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function useAttendanceMatrix(query: AttendanceMatrixQuery | null, paging: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...staffKeys.attendance(), 'matrix', query, paging] as const,
    enabled: query !== null,
    placeholderData: keepPreviousData,
    retry: false,
    queryFn: () =>
      api.get<AttendanceMatrixPage>('/staff/attendance/matrix', {
        params: { ...matrixParams(query!), page: String(paging.page), limit: String(paging.limit) },
      }),
  });
}
