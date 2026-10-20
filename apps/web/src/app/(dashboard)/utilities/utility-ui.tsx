import type { ReactNode } from 'react';
import { Droplets, Flame, Zap } from 'lucide-react';
import { todayIST } from '@/lib/date';

export const METER_TYPES = ['water', 'electricity', 'gas'] as const;

export type MeterType = (typeof METER_TYPES)[number];

export function meterTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function meterTypeIcon(type: string): ReactNode {
  switch (type) {
    case 'water':
      return <Droplets className="h-4 w-4 text-blue-500" />;
    case 'electricity':
      return <Zap className="h-4 w-4 text-yellow-500" />;
    case 'gas':
      return <Flame className="h-4 w-4 text-orange-500" />;
    default:
      return null;
  }
}

export function billStatusVariant(status: string): 'warning' | 'success' | 'secondary' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'invoiced':
      return 'success';
    default:
      return 'secondary';
  }
}

export function today(): string {
  return todayIST();
}
