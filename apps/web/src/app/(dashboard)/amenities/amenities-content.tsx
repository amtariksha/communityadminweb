'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { useAmenities } from '@/hooks';
import { AmenitiesTab } from './amenities-tab';
import { BookingsCalendar } from './calendar/bookings-calendar';

// Kept here for the callers that import it with the page.
export { AMENITY_TYPES } from './amenity-labels';

type Tab = 'amenities' | 'bookings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'amenities', label: 'Amenities' },
  { key: 'bookings', label: 'Bookings' },
];

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'amenity_type', label: 'Type' },
  { key: 'pricing_type', label: 'Pricing' },
  { key: 'price_per_unit', label: 'Rate' },
  { key: 'is_active', label: 'Active' },
];

/**
 * /amenities: the Amenities and Bookings tabs (the standard layout's
 * screen; classic reaches the same pieces as Amenity & Event pages).
 */
export default function AmenitiesContent(): ReactNode {
  // Bookings are the day-to-day workload; amenities are set up once. The
  // page opens on Bookings so admins land on the calendar.
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [createOpen, setCreateOpen] = useState(false);
  const allAmenities = useAmenities().data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Amenities' }]}
        title="Amenities"
        description="Manage community amenities and bookings"
        actions={
          <>
            <ExportButton
              data={allAmenities as unknown as Record<string, unknown>[]}
              filename={`amenities-${new Date().toISOString().split('T')[0]}`}
              columns={EXPORT_COLUMNS}
            />
            {activeTab === 'amenities' && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Amenity
              </Button>
            )}
          </>
        }
      />
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'amenities' && <AmenitiesTab createOpen={createOpen} setCreateOpen={setCreateOpen} />}
      {activeTab === 'bookings' && <BookingsCalendar />}
    </div>
  );
}
