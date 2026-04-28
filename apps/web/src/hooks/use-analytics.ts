'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// The backend returns nested breakdown objects per pillar. `overall` is a
// simple number; each of financial/operational/compliance is an object whose
// `score` field is what the UI cards display.
export interface HealthPillarBreakdown {
  score: number;
  [key: string]: unknown;
}

export interface HealthScore {
  financial: HealthPillarBreakdown;
  operational: HealthPillarBreakdown;
  compliance: HealthPillarBreakdown;
  overall: number;
  details?: Record<string, unknown>;
}

/** Safely pull a pillar's numeric score out of the nested response. */
export function pillarScore(
  pillar: HealthPillarBreakdown | number | undefined,
): number {
  if (typeof pillar === 'number') return pillar;
  if (pillar && typeof pillar === 'object' && typeof pillar.score === 'number') {
    return pillar.score;
  }
  return 0;
}

export interface HealthScoreTrend {
  month: string;
  financial: number;
  operational: number;
  compliance: number;
  overall: number;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  data: unknown;
}

export interface MaintenancePrediction {
  category: string;
  health_score: number;
  trend: string;
  next_predicted_issue_date: string | null;
  amc_status: unknown;
}

export interface BenchmarkMetric {
  // QA #117 — backend emits `label` + `percentile_rank`. UI used to
  // read `name` + `percentile` against an `metrics: []` field that
  // didn't exist on the wire — every benchmark row rendered as
  // empty. Both naming conventions kept here so the hook can adapt
  // either response shape.
  name: string;
  label?: string;
  tenant_value: number | null;
  platform_avg: number | null;
  percentile: number | null;
  percentile_rank?: number | null;
  unit?: string;
}

/**
 * Backend's getBenchmarkData returns a flat object keyed by metric
 * name (`maintenance_cost_per_sqft`, `collection_efficiency`,
 * `avg_ticket_resolution_hours`, `staff_to_unit_ratio`). Each value
 * carries `label` and `percentile_rank`. The UI table iterates
 * `data.metrics` — we synthesize that array here from the keyed
 * accessors, normalizing field names along the way.
 */
interface BenchmarkResponse {
  metrics?: BenchmarkMetric[];
  maintenance_cost_per_sqft?: BenchmarkMetric;
  collection_efficiency?: BenchmarkMetric;
  avg_ticket_resolution_hours?: BenchmarkMetric;
  staff_to_unit_ratio?: BenchmarkMetric;
  computed_at?: string;
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  healthScore: () => [...analyticsKeys.all, 'health-score'] as const,
  trend: (months: number) => [...analyticsKeys.all, 'trend', months] as const,
  benchmark: () => [...analyticsKeys.all, 'benchmark'] as const,
  anomalies: () => [...analyticsKeys.all, 'anomalies'] as const,
  predictions: () => [...analyticsKeys.all, 'predictions'] as const,
};

export function useHealthScore() {
  return useQuery({
    queryKey: analyticsKeys.healthScore(),
    queryFn: () => api.get<{ data: HealthScore }>('/analytics/health-score').then((r) => r.data),
  });
}

export function useHealthScoreTrend(months = 6) {
  return useQuery({
    queryKey: analyticsKeys.trend(months),
    queryFn: () =>
      api
        .get<{ data: HealthScoreTrend[] }>('/analytics/health-score/trend', { params: { months: String(months) } })
        .then((r) => r.data),
  });
}

export function useBenchmark() {
  return useQuery({
    queryKey: analyticsKeys.benchmark(),
    queryFn: async () => {
      const res = await api.get<{ data: BenchmarkResponse }>(
        '/analytics/benchmark',
      );
      const raw = res.data ?? {};

      // If the server already shipped a `metrics` array (future
      // shape), pass it through unchanged after field-name
      // normalization. Otherwise, synthesize the array from the
      // flat keyed accessors so the table can iterate.
      const adapt = (m?: BenchmarkMetric): BenchmarkMetric | null =>
        m
          ? {
              name: m.name ?? m.label ?? '',
              label: m.label ?? m.name,
              tenant_value: m.tenant_value ?? null,
              platform_avg: m.platform_avg ?? null,
              percentile: m.percentile ?? m.percentile_rank ?? null,
              percentile_rank: m.percentile_rank ?? m.percentile ?? null,
              unit: m.unit,
            }
          : null;

      const fromArray = Array.isArray(raw.metrics)
        ? raw.metrics.map((m) => adapt(m)).filter((m): m is BenchmarkMetric => m !== null)
        : [];
      const fromKeyed = [
        adapt(raw.maintenance_cost_per_sqft),
        adapt(raw.collection_efficiency),
        adapt(raw.avg_ticket_resolution_hours),
        adapt(raw.staff_to_unit_ratio),
      ].filter((m): m is BenchmarkMetric => m !== null);

      return {
        metrics: fromArray.length > 0 ? fromArray : fromKeyed,
      };
    },
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: analyticsKeys.anomalies(),
    queryFn: () => api.get<{ data: { anomalies: Anomaly[] } }>('/analytics/anomalies').then((r) => r.data),
  });
}

export function useMaintenancePredictions() {
  return useQuery({
    queryKey: analyticsKeys.predictions(),
    queryFn: () =>
      api
        .get<{ data: { predictions: MaintenancePrediction[] } }>('/analytics/maintenance-predictions')
        .then((r) => r.data),
  });
}
