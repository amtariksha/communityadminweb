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
  name: string;
  tenant_value: number;
  platform_avg: number;
  percentile: number;
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
    queryFn: () => api.get<{ data: { metrics: BenchmarkMetric[] } }>('/analytics/benchmark').then((r) => r.data),
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
