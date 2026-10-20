'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGateUsage, type GateUsageSummary } from '@/hooks/use-gate-desk';

const PANIC_LABELS: Readonly<Record<string, string>> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  false_alarm: 'False alarm',
  cancelled: 'Cancelled',
};

// Announcements › Create opens with this draft; nothing is sent from here.
export const INFORM_RESIDENTS_HREF = '/announcements/new?draft=gate-preapprove';

function Tile({ label, value, note }: { label: string; value: string; note?: string }): ReactNode {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

const dayLabel = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

function Tiles({ usage }: { usage: GateUsageSummary }): ReactNode {
  const week = usage.entries_by_day.reduce((sum, day) => sum + day.total, 0);
  const panic = Object.values(usage.panic_alerts).reduce((sum, count) => sum + count, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Tile label="Gate entries, last 7 days" value={String(week)} note="Visitors, staff and parcels" />
      <Tile
        label="Visitors pre-approved, 30 days"
        value={`${usage.pre_approval.percent}%`}
        note={`${usage.pre_approval.pre_approved} of ${usage.pre_approval.checked_in} visitors`}
      />
      <Tile
        label="Residents pre-approving, 30 days"
        value={`${usage.resident_adoption.pre_approvers} / ${usage.resident_adoption.residents_with_app}`}
        note="Of the residents with the app"
      />
      <Tile
        label="Exceptions, last 7 days"
        value={String(usage.exceptions.overstay_alerts + usage.exceptions.denied_entries)}
        note={`${usage.exceptions.overstay_alerts} overstays · ${usage.exceptions.denied_entries} denied`}
      />
      <Tile label="Panic alerts, last week" value={String(panic)} />
    </div>
  );
}

/**
 * Gate & Visitors › Usage Summary (GATE-S3, GATE-44): how much the gate app
 * is used, with Inform Residents to nudge them to pre-approve visitors.
 */
export function UsageContent(): ReactNode {
  const query = useGateUsage();
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError) return <p role="alert" className="text-sm text-destructive">The usage summary could not be loaded.</p>;
  if (!query.data) return <p className="text-sm text-muted-foreground">The usage summary is not available yet.</p>;
  const usage = query.data;
  const panicRows = Object.entries(usage.panic_alerts).map(([status, count]) => ({ status: PANIC_LABELS[status] ?? status, count }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={INFORM_RESIDENTS_HREF} className="text-sm text-primary underline">
          Inform Residents
        </Link>
      </div>
      <Tiles usage={usage} />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gate entries per day</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage.entries_by_day.map((day) => ({ ...day, label: dayLabel(day.day) }))}>
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="visitors" stackId="a" name="Visitors" fill="var(--color-primary)" />
                <Bar dataKey="staff" stackId="a" name="Staff" fill="var(--color-muted-foreground)" />
                <Bar dataKey="parcels" stackId="a" name="Parcels" fill="var(--color-accent-foreground)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Panic alerts by status, last week</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={panicRows}>
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Alerts" fill="var(--color-destructive)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
