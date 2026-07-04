'use client';

import { type ReactNode } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useReadings, type Meter } from '@/hooks/use-utilities';

const TYPE_COLOR: Record<Meter['meter_type'], string> = {
  water: '#3b82f6',
  electricity: '#f59e0b',
  gas: '#ef4444',
};

const TYPE_UNIT: Record<Meter['meter_type'], string> = {
  water: 'kL',
  electricity: 'kWh',
  gas: 'kg',
};

/**
 * Phase 5 #25 — per-meter consumption trend. Bars = consumption per reading
 * period; the line overlays the cumulative meter reading. Reads the existing
 * /utility/readings/:meterId series — no new endpoint.
 */
export function MeterConsumptionChart({ meter }: { meter: Meter }): ReactNode {
  const { data: readings, isLoading } = useReadings(meter.id);
  const color = TYPE_COLOR[meter.meter_type];
  const unit = TYPE_UNIT[meter.meter_type];

  if (isLoading) return <Skeleton className="h-72 w-full" />;

  const rows = (readings?.data ?? [])
    .slice()
    .sort((a, b) => a.reading_date.localeCompare(b.reading_date))
    .map((r) => ({
      date: r.reading_date.slice(0, 10),
      consumption: Number(r.consumption) || 0,
      reading: Number(r.reading_value),
    }));

  if (rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No readings recorded for this meter yet.
      </div>
    );
  }

  const totalConsumption = rows.reduce((sum, r) => sum + r.consumption, 0);
  const avg = totalConsumption / rows.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6 text-sm">
        <span>
          <span className="text-muted-foreground">Readings: </span>
          <span className="font-medium">{rows.length}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium">
            {totalConsumption.toFixed(2)} {unit}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Avg / period: </span>
          <span className="font-medium">
            {avg.toFixed(2)} {unit}
          </span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="consumption"
            name={`Consumption (${unit})`}
            fill={color}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="reading"
            name="Meter reading"
            stroke="#8b5cf6"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
