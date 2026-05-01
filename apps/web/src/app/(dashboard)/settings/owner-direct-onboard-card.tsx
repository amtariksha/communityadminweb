'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  useOwnerDirectOnboardSetting,
  useUpdateOwnerDirectOnboardSetting,
} from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { getUser, getCurrentTenant } from '@/lib/auth';

// Roles allowed to flip the toggle, per qa-round13.md §B decision #2.
// committee_member can READ the value (it's public to any authed
// tenant member by D1 #13-1c) but not WRITE — backend Roles guard
// enforces the same allowlist.
const EDIT_ROLES = new Set(['super_admin', 'community_admin']);

function currentRole(): string | null {
  const user = getUser();
  if (!user) return null;
  if (user.isSuperAdmin) return 'super_admin';
  const tenantId = getCurrentTenant();
  if (!tenantId) return user.role ?? null;
  const tenancy = user.societies.find((s) => s.id === tenantId);
  return tenancy?.role ?? user.role ?? null;
}

/**
 * QA #13-2a — per-society toggle that controls whether unit owners
 * can onboard their own tenants without going through the
 * committee-approval workflow.
 *
 * State sources:
 *   - GET /tenant-settings/owner-direct-onboard (D1 #13-1c) →
 *     `{ enabled: boolean }`. Public read.
 *   - PATCH /tenant-settings/owner-direct-onboard (D1 #13-1d) →
 *     same shape. RBAC: community_admin / super_admin only.
 *
 * UX shape:
 *   - Read-only checkbox for non-admin roles (matches HelpContactCard
 *     pattern for sister cards on this page).
 *   - Confirmation dialog ONLY when flipping the toggle ON — flipping
 *     OFF is a tightening of the policy and doesn't need a guard.
 *     Per the prompt: "Owners will be able to onboard tenants
 *     without approval. Proceed?".
 *   - Errors fall through to the standard friendlyError toast.
 *
 * This card lives between HelpContactCard and TdsConfigCard on the
 * Settings page (settings-content.tsx) — see the QA #13-2a comment
 * in that file for the placement rationale.
 *
 * NOTE: backend D1 endpoints have not yet shipped at the time of
 * writing. Until they deploy, the GET fails and this card stays in
 * its loading skeleton; once D1 lands the card lights up
 * automatically with no admin-web change.
 */
export function OwnerDirectOnboardCard(): ReactNode {
  const { addToast } = useToast();
  const settingQuery = useOwnerDirectOnboardSetting();
  const updateMutation = useUpdateOwnerDirectOnboardSetting();

  const role = useMemo(() => currentRole(), []);
  const canEdit = role !== null && EDIT_ROLES.has(role);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentEnabled = settingQuery.data?.enabled ?? false;

  function handleCheckboxChange(nextEnabled: boolean): void {
    if (!canEdit) return;
    if (nextEnabled) {
      // Flipping ON requires explicit confirmation — relaxing the
      // policy means owners can add tenants without committee
      // review for the rest of this society's lifetime until an
      // admin flips it back. Worth a one-click guard.
      setConfirmOpen(true);
      return;
    }
    // Flipping OFF tightens the policy — apply immediately.
    persist(false);
  }

  function persist(nextEnabled: boolean): void {
    updateMutation.mutate(
      { enabled: nextEnabled },
      {
        onSuccess() {
          addToast({
            title: nextEnabled
              ? 'Owners can now onboard tenants directly'
              : 'Owner direct-onboard disabled',
            description: nextEnabled
              ? 'Direct onboardings are still logged in the audit trail.'
              : 'Owner-initiated onboardings will require committee approval again.',
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to update setting',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function confirmEnable(): void {
    setConfirmOpen(false);
    persist(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Owner-initiated tenant onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <input
                type="checkbox"
                checked={currentEnabled}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                disabled={!canEdit || updateMutation.isPending}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Allow unit owners to onboard tenants directly
                </p>
                <p className="text-xs text-muted-foreground">
                  When enabled, unit owners can add their own tenants
                  without committee approval. Each direct onboarding is
                  still logged for audit.
                </p>
                {!canEdit && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">Read-only —</span> only
                    community admins and super admins can change this
                    setting.
                  </p>
                )}
              </div>
            </label>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allow direct tenant onboarding?</DialogTitle>
            <DialogDescription>
              Owners will be able to onboard tenants without approval.
              Proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm text-muted-foreground">
            <p>
              Each direct onboarding still writes an audit-log entry, so
              you&rsquo;ll be able to review who added whom. You can
              flip this setting back at any time.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={confirmEnable}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
