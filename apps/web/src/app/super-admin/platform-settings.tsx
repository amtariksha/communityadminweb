'use client';

import { useState, type ReactNode } from 'react';
import { MessageSquare, CreditCard, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  usePlatformConfig,
  useUpdatePlatformConfig,
} from '@/hooks';
import type { TdsConfig } from '@/hooks';
import { TdsConfigEditor } from '@/components/tds/tds-config-editor';
import { GstRatesEditor } from '@/components/super-admin/gst-rates-editor';
import { PaymentsSettings } from '@/components/super-admin/payments-settings';
import { OtpSection } from './otp-settings';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

// Q2 (2026-10-20): Storage, Push Notifications, Email and Branding are gone —
// they saved platform_config keys nothing reads (storage, push, e-mail and
// branding come from the server environment). Payments has its own route,
// which reads and writes what the API uses.
type SettingsTab = 'otp' | 'payments' | 'tax';

const TABS: { key: SettingsTab; label: string; icon: typeof MessageSquare }[] = [
  { key: 'otp', label: 'OTP & Messaging', icon: MessageSquare },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'tax', label: 'Tax Defaults', icon: Receipt },
];

// ---------------------------------------------------------------------------
// Config key mapping (the generic platform-config route)
// ---------------------------------------------------------------------------

const TAB_CONFIG_KEYS: Record<Exclude<SettingsTab, 'payments'>, string> = {
  otp: 'otp_provider',
  tax: 'tds_config',
};

// ---------------------------------------------------------------------------
// Tax Defaults Tab — TDS thresholds & rates that every tenant inherits
// unless they override in Community Settings.
// ---------------------------------------------------------------------------

function TaxDefaultsSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  // The platform_config row stores the same shape as TdsConfig; cast
  // is safe — anything malformed is replaced by editor defaults.
  const tdsConfig = config as unknown as TdsConfig | null;

  return (
    <div className="space-y-6">
      {/* QA Round 12 #12-3c — GST rates editor. Renders ABOVE TDS
          because GST is the more frequently used config (every
          invoice line touches it; TDS only kicks in on vendor bills
          above the threshold). Self-contained: it wires to its own
          PATCH endpoint and cache, so the parent doesn't need to
          plumb config / onSave / isPending through. */}
      <GstRatesEditor />

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These are the TDS rules applied to every tenant&apos;s vendor bills
          unless that tenant has set its own override on the
          Community-Admin → Settings page. Update these whenever CBDT
          notifies new thresholds or rates — changes propagate to every
          tenant automatically (5-min Redis cache TTL).
        </p>
        <TdsConfigEditor
          value={tdsConfig ?? null}
          onSave={(cfg) => onSave(cfg as unknown as Record<string, unknown>)}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PlatformSettings(): ReactNode {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('otp');

  const configQuery = usePlatformConfig();
  const updateConfig = useUpdatePlatformConfig();

  // Build a map from config key to value
  const configMap: Record<string, Record<string, unknown>> = {};
  if (configQuery.data) {
    for (const item of configQuery.data) {
      configMap[item.key] = (item.value ?? {}) as Record<string, unknown>;
    }
  }

  function handleSave(tabKey: keyof typeof TAB_CONFIG_KEYS, value: Record<string, unknown>): void {
    const configKey = TAB_CONFIG_KEYS[tabKey];
    updateConfig.mutate(
      { key: configKey, value },
      {
        onSuccess() {
          addToast({ title: 'Settings saved', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to save settings',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function getConfigForTab(tab: keyof typeof TAB_CONFIG_KEYS): Record<string, unknown> {
    return configMap[TAB_CONFIG_KEYS[tab]] ?? {};
  }

  if (configQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // QA #84 — platform-config fetch failures previously fell through to
  // the tabbed form with every section reading from an empty configMap
  // (no loader, no error, just blank inputs). Testers reported the page
  // as "blank". Show an explicit error + retry instead.
  if (configQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            Failed to load platform configuration.
          </p>
          <p className="text-sm text-muted-foreground">
            {(configQuery.error as Error)?.message ?? 'Unknown error'}
          </p>
          <Button onClick={() => configQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="mr-1.5 h-4 w-4 inline-block" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {TABS.find((t) => t.key === activeTab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'otp' && (
            <OtpSection
              config={getConfigForTab('otp')}
              onSave={(v) => handleSave('otp', v)}
              isPending={updateConfig.isPending}
            />
          )}
          {activeTab === 'payments' && <PaymentsSettings />}
          {activeTab === 'tax' && (
            <TaxDefaultsSection
              config={getConfigForTab('tax')}
              onSave={(v) => handleSave('tax', v)}
              isPending={updateConfig.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
