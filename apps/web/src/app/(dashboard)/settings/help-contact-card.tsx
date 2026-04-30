'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Save, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useHelpContact, useUpdateHelpContact } from '@/hooks';
import type { HelpContactCustomLink } from '@/hooks';
import { getUser, getCurrentTenant } from '@/lib/auth';

// Roles allowed to edit Help & Support per backend Zod gate.
const EDIT_ROLES = new Set(['super_admin', 'community_admin', 'committee_member']);

function currentRole(): string | null {
  const user = getUser();
  if (!user) return null;
  if (user.isSuperAdmin) return 'super_admin';
  const tenantId = getCurrentTenant();
  if (!tenantId) return user.role ?? null;
  const tenancy = user.societies.find((s) => s.id === tenantId);
  return tenancy?.role ?? user.role ?? null;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * QA #350 — per-society Help & Support card on the Settings page.
 *
 * Backed by /tenant-settings/help-contact (GET readable by every
 * tenant member; PATCH gated to super_admin / community_admin /
 * committee_member). Persists at
 * `tenants.settings_json.help_contact`.
 *
 * Non-admin roles see the card in read-only mode (Save button
 * hidden, inputs disabled). Empty saves are allowed — the backend
 * accepts `null` to clear the help_contact block entirely; this
 * card only exposes per-field edits, not the full clear (use a
 * follow-up "Reset" button if needed).
 */
export function HelpContactCard(): ReactNode {
  const { addToast } = useToast();
  const helpQuery = useHelpContact();
  const updateMutation = useUpdateHelpContact();

  const role = useMemo(() => currentRole(), []);
  const canEdit = role !== null && EDIT_ROLES.has(role);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hours, setHours] = useState('');
  const [escalationPhone, setEscalationPhone] = useState('');
  const [customLinks, setCustomLinks] = useState<HelpContactCustomLink[]>([]);

  useEffect(() => {
    if (helpQuery.data === undefined) return;
    const data = helpQuery.data ?? {};
    setPhone(data.phone ?? '');
    setEmail(data.email ?? '');
    setWhatsapp(data.whatsapp ?? '');
    setHours(data.hours ?? '');
    setEscalationPhone(data.escalation_phone ?? '');
    setCustomLinks(Array.isArray(data.custom_links) ? data.custom_links : []);
  }, [helpQuery.data]);

  function addCustomLink(): void {
    setCustomLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function removeCustomLink(idx: number): void {
    setCustomLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCustomLink(
    idx: number,
    patch: Partial<HelpContactCustomLink>,
  ): void {
    setCustomLinks((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  }

  async function handleSave(): Promise<void> {
    if (email && !EMAIL_RE.test(email)) {
      addToast({ title: 'Invalid email address', variant: 'destructive' });
      return;
    }
    // Reject malformed custom-link URLs before round-tripping to the
    // backend (which Zod-rejects them anyway, but the inline error
    // is friendlier than a 400 toast).
    for (const [i, link] of customLinks.entries()) {
      if (!link.label.trim()) {
        addToast({
          title: `Custom link ${i + 1} needs a label`,
          variant: 'destructive',
        });
        return;
      }
      if (!URL_RE.test(link.url)) {
        addToast({
          title: `Custom link ${i + 1} URL must start with http:// or https://`,
          variant: 'destructive',
        });
        return;
      }
    }

    updateMutation.mutate(
      {
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        hours: hours.trim() || undefined,
        escalation_phone: escalationPhone.trim() || undefined,
        custom_links: customLinks.length > 0 ? customLinks : undefined,
      },
      {
        onSuccess() {
          addToast({ title: 'Help & Support contact saved', variant: 'success' });
        },
        onError(err) {
          addToast({
            title: 'Failed to save Help & Support',
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
          <LifeBuoy className="h-4 w-4" />
          Help & Support Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        {helpQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Contact details residents see in the Help & Support
              screen of the resident app.
              {!canEdit && (
                <>
                  {' '}
                  <span className="font-medium">Read-only —</span>{' '}
                  only community admins and committee members can edit.
                </>
              )}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="hc-phone">Primary phone</Label>
                <Input
                  id="hc-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hc-email">Email</Label>
                <Input
                  id="hc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="help@society.in"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hc-whatsapp">WhatsApp</Label>
                <Input
                  id="hc-whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hc-hours">Hours</Label>
                <Input
                  id="hc-hours"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Mon–Sat 9:00 AM – 6:00 PM"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="hc-escalation">Escalation phone</Label>
                <Input
                  id="hc-escalation"
                  type="tel"
                  value={escalationPhone}
                  onChange={(e) => setEscalationPhone(e.target.value)}
                  placeholder="Committee president direct line"
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Custom links — admin can add up to 20 (backend cap).
                Each row is a label + URL; resident UI renders them
                as action chips below the standard contact methods. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom links</Label>
                {canEdit && customLinks.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomLink}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add link
                  </Button>
                )}
              </div>
              {customLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No custom links yet. Use these for community
                  WhatsApp groups, Notion handbooks, or any external
                  resource you want residents to access.
                </p>
              ) : (
                <div className="space-y-2">
                  {customLinks.map((link, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`hc-link-label-${idx}`} className="text-xs">
                          Label
                        </Label>
                        <Input
                          id={`hc-link-label-${idx}`}
                          value={link.label}
                          onChange={(e) =>
                            updateCustomLink(idx, { label: e.target.value })
                          }
                          placeholder="e.g. WhatsApp group"
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex-[2] space-y-1">
                        <Label htmlFor={`hc-link-url-${idx}`} className="text-xs">
                          URL
                        </Label>
                        <Input
                          id={`hc-link-url-${idx}`}
                          value={link.url}
                          onChange={(e) =>
                            updateCustomLink(idx, { url: e.target.value })
                          }
                          placeholder="https://chat.whatsapp.com/..."
                          disabled={!canEdit}
                        />
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomLink(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Saving…' : 'Save Help & Support'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
