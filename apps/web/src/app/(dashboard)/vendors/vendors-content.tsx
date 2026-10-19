'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useDeactivateVendor } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { VendorDetailDialog } from './vendor-detail-dialog';
import { AddVendorDialog, EditVendorDialog } from './vendor-form-dialog';
import { VendorList } from './vendor-list';
import { VendorRatingsTab } from './vendor-ratings-tab';

type VendorTab = 'vendors' | 'ratings';

const TABS: ReadonlyArray<{ key: VendorTab; label: string }> = [
  { key: 'vendors', label: 'Vendors' },
  { key: 'ratings', label: 'Ratings' },
];

function TabStrip({ active, onChange }: { active: VendorTab; onChange: (tab: VendorTab) => void }): ReactNode {
  return (
    <div className="flex gap-1 rounded-lg border bg-muted p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function VendorsContent(): ReactNode {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<VendorTab>('vendors');
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const deactivateVendor = useDeactivateVendor();

  function handleDeactivate(id: string): void {
    deactivateVendor.mutate(id, {
      onSuccess() {
        setDetailId(null);
        addToast({ title: 'Vendor deactivated', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to deactivate vendor', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Vendors' }]}
        title="Vendors"
        description="Manage society vendors and suppliers — contact info, bank details, TDS"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Vendor
          </Button>
        }
      />
      <TabStrip active={activeTab} onChange={setActiveTab} />
      {activeTab === 'vendors' && (
        <VendorList
          onOpen={setDetailId}
          onEdit={setEditId}
          onDeactivate={handleDeactivate}
          deactivating={deactivateVendor.isPending}
        />
      )}
      {activeTab === 'ratings' && <VendorRatingsTab />}
      <AddVendorDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditVendorDialog vendorId={editId} onClose={() => setEditId(null)} />
      <VendorDetailDialog
        vendorId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(id) => { setDetailId(null); setEditId(id); }}
        onDeactivate={handleDeactivate}
        deactivating={deactivateVendor.isPending}
      />
    </div>
  );
}
