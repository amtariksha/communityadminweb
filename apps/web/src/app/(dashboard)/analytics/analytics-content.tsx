'use client';

import { type ReactNode } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/utils';
import {
  useHealthScore,
  useHealthScoreTrend,
  useBenchmark,
  useAnomalies,
  useMaintenancePredictions,
  pillarScore,
} from '@/hooks/use-analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score > 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBgColor(score: number): string {
  if (score > 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function severityVariant(
  severity: string,
): 'destructive' | 'warning' | 'default' | 'secondary' {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function trendIcon(trend: string): string {
  switch (trend) {
    case 'improving':
      return '\u2191';
    case 'declining':
      return '\u2193';
    default:
      return '\u2192';
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsContent(): ReactNode {
  const healthQuery = useHealthScore();
  const trendQuery = useHealthScoreTrend(6);
  const anomalyQuery = useAnomalies();
  const predictionsQuery = useMaintenancePredictions();
  const benchmarkQuery = useBenchmark();

  const health = healthQuery.data;
  const trendData = trendQuery.data ?? [];
  const anomalies = anomalyQuery.data?.anomalies ?? [];
  const predictions = predictionsQuery.data?.predictions ?? [];
  const benchmarkMetrics = benchmarkQuery.data?.metrics ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Analytics' }]}
        title="Analytics"
        description="Society health scores, trends, anomalies, and maintenance predictions"
      />

      {/* Health Score Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {healthQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <HealthCard label="Financial" score={pillarScore(health?.financial)} />
            <HealthCard label="Operational" score={pillarScore(health?.operational)} />
            <HealthCard label="Compliance" score={pillarScore(health?.compliance)} />
            <HealthCard label="Overall" score={health?.overall ?? 0} />
          </>
        )}
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Health Score Trend (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="financial" stroke="#22c55e" name="Financial" />
                <Line type="monotone" dataKey="operational" stroke="#3b82f6" name="Operational" />
                <Line type="monotone" dataKey="compliance" stroke="#f59e0b" name="Compliance" />
                <Line type="monotone" dataKey="overall" stroke="#8b5cf6" name="Overall" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No trend data available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle>Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anomalyQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : anomalies.length > 0 ? (
                anomalies.map((anomaly, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant={severityVariant(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{anomaly.type}</TableCell>
                    <TableCell className="text-muted-foreground">{anomaly.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No anomalies detected.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Maintenance Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Health Score</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Next Issue Date</TableHead>
                <TableHead>AMC Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictionsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : predictions.length > 0 ? (
                predictions.map((prediction, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium capitalize">{prediction.category}</TableCell>
                    <TableCell>
                      <span className={scoreColor(prediction.health_score)}>
                        {prediction.health_score}
                      </span>
                    </TableCell>
                    <TableCell className="text-lg">{trendIcon(prediction.trend)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {prediction.next_predicted_issue_date
                        ? formatDate(prediction.next_predicted_issue_date)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {prediction.amc_status ? String(prediction.amc_status) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No maintenance predictions available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Benchmark */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmark Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {benchmarkQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : benchmarkMetrics.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {benchmarkMetrics.map((metric) => (
                <Card key={metric.name} className="border">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Your Value</p>
                        <p className="text-xl font-bold">{metric.tenant_value}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Platform Avg</p>
                        <p className="text-xl font-bold text-muted-foreground">
                          {metric.platform_avg}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Percentile: {metric.percentile}%
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No benchmark data available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health Score Card
// ---------------------------------------------------------------------------

function HealthCard({ label, score }: { label: string; score: number }): ReactNode {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 rounded-full ${scoreBgColor(score)}`} />
          <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        </div>
      </CardContent>
    </Card>
  );
}
