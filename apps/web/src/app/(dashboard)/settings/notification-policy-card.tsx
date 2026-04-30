'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Bell, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks';
import { getCurrentTenant } from '@/lib/auth';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '@communityos/shared';

// IANA timezones the picker offers. Leaves room to expand later but
// covers the 4 cities CommunityOS already runs in.
const TZ_OPTIONS = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'UTC',
] as const;

// Categories an admin can choose to put on the urgent-allow list.
// Filtered to the categories that actually originate from a tenant
// admin (or via system events on the tenant). Guard-only categories
// stay out — they fire from the gate flow and admins don't compose
// them directly.
const POLICY_CATEGORIES = Object.values(NOTIFICATION_CATEGORIES).filter(
  (c) =>
    c.audience.includes('resident') ||
    c.id === 'staff_announcement' ||
    c.id === 'committee_escalation',
);

function categoryLabel(id: string): string {
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * NotifPlan §"Phase 5" — per-tenant notification policy card.
 *
 * Two levers, both stored on `tenants.settings_json.notification_policy`:
 *   1. Urgent-allow whitelist — restricts which categories may fire
 *      with `urgency='urgent'`. Empty = legacy "any category" behaviour.
 *      Backend enforcement lives in
 *      NotificationService.sendCustomNotification (silent demote to
 *      'normal' + warn log).
 *   2. Default quiet hours for new residents — applied on user create;
 *      existing residents keep their personal override.
 *
 * The save path uses the existing `useTenantSettings` mutation so the
 * optimistic-lock + jsonb deep-merge plumbing the rest of the
 * settings page already relies on works here too. Saving with all
 * fields cleared writes `notification_policy: { allow_urgent_for: [] }`
 * with `default_quiet_hours: null` so the tenant explicitly opts out.
 */
export function NotificationPolicyCard(): ReactNode {
  const tenantId = getCurrentTenant();
  const { data: tenant, isLoading } = useTenant(tenantId ?? '');
  const updateSettings = useTenantSettings();
  const { addToast } = useToast();

  // Saved state — hydrate once tenant loads.
  const [allowUrgentFor, setAllowUrgentFor] = useState<Set<NotificationCategory>>(
    new Set(),
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [quietTz, setQuietTz] = useState<string>('Asia/Kolkata');

  useEffect(() => {
    if (!tenant) return;
    const policy = tenant.settings_json?.notification_policy;
    setAllowUrgentFor(
      new Set(
        ((policy?.allow_urgent_for ?? []) as NotificationCategory[]).filter((c) =>
          POLICY_CATEGORIES.some((pc) => pc.id === c),
        ),
      ),
    );
    const qh = policy?.default_quiet_hours;
    if (qh && typeof qh === 'object') {
      setQuietHoursEnabled(true);
      setQuietStart(qh.start ?? '22:00');
      setQuietEnd(qh.end ?? '07:00');
      setQuietTz(qh.tz ?? 'Asia/Kolkata');
    } else {
      setQuietHoursEnabled(false);
      setQuietStart('22:00');
      setQuietEnd('07:00');
      setQuietTz('Asia/Kolkata');
    }
  }, [tenant]);

  const allCategoryIds = useMemo(
    () => POLICY_CATEGORIES.map((c) => c.id as NotificationCategory),
    [],
  );

  const allSelected =
    allowUrgentFor.size === 0 || allowUrgentFor.size === allCategoryIds.length;

  if (!tenantId) return null;

  function toggleCategory(id: NotificationCategory): void {
    setAllowUrgentFor((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(): void {
    setAllowUrgentFor(new Set(allCategoryIds));
  }

  function clearAll(): void {
    setAllowUrgentFor(new Set());
  }

  async function handleSave(): Promise<void> {
    if (!tenantId || !tenant) return;
    if (quietHoursEnabled) {
      if (!HHMM.test(quietStart) || !HHMM.test(quietEnd)) {
        addToast({
          title: 'Quiet hours must be HH:MM (24h)',
          variant: 'destructive',
        });
        return;
      }
    }
    // When the user has selected ALL categories we send an empty
    // array — the backend treats empty as "no restriction", which is
    // semantically the same as "all allowed" but keeps the stored
    // shape compact (no need to chase the catalog if a new category
    // ships later).
    const allowList: string[] =
      allowUrgentFor.size === 0 || allowUrgentFor.size === allCategoryIds.length
        ? []
        : Array.from(allowUrgentFor);

    updateSettings.mutate(
      {
        tenant_id: tenantId,
        settings: {
          notification_policy: {
            allow_urgent_for: allowList,
            default_quiet_hours: quietHoursEnabled
              ? { start: quietStart, end: quietEnd, tz: quietTz }
              : null,
          },
        },
        expected_row_version: tenant.row_version,
      },
      {
        onSuccess() {
          addToast({
            title: 'Notification policy saved',
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to save notification policy',
            description: (err as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notification Policy
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Tenant-wide rules applied at notification send time. Per-resident
              preferences (mute, quiet hours) override these defaults.
            </p>

            {/* ----- Urgent allowlist ----- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Allow urgent send for</Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={selectAll}
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={clearAll}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                When non-empty, only these categories may bypass mutes +
                quiet hours. Leaving every box checked (or none — same
                effect) means any category may go urgent if the sender's
                role allows it.
              </p>
              <div className="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
                {POLICY_CATEGORIES.map((cat) => {
                  const id = cat.id as NotificationCategory;
                  const checked =
                    allSelected || allowUrgentFor.has(id);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={checked}
                        onChange={() => toggleCategory(id)}
                      />
                      <span>{categoryLabel(id)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ----- Default quiet hours ----- */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                />
                <span>Seed default quiet hours for new residents</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Applied to a resident's notification preferences when their
                user account is first created. Existing residents keep
                their personal settings.
              </p>
              {quietHoursEnabled && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="qh-start" className="text-xs">
                      Start (24h)
                    </Label>
                    <Input
                      id="qh-start"
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="qh-end" className="text-xs">
                      End (24h)
                    </Label>
                    <Input
                      id="qh-end"
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="qh-tz" className="text-xs">
                      Timezone
                    </Label>
                    <Select
                      id="qh-tz"
                      value={quietTz}
                      onChange={(e) => setQuietTz(e.target.value)}
                    >
                      {TZ_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Saving…' : 'Save Policy'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
