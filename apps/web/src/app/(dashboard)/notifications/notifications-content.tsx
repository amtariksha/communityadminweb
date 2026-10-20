'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Send,
  Bell,
  Mail,
  Smartphone,
  AlertTriangle,
  TestTube,
  Inbox,
  Eye,
  CheckCheck,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { getUser, getCurrentTenant } from '@/lib/auth';
import {
  useNotificationTemplates,
  useCreateTemplate,
  useSendTemplate,
  useTestSendTemplate,
  useSentNotifications,
  useAudienceCount,
  useBlocks,
  useNotificationChannels,
  useUnitBlocks,
} from '@/hooks';
import { useAdminLayout } from '@/lib/layout-context';
import {
  BroadcastChannel,
  BroadcastPromotional,
  BroadcastConfirm,
  BroadcastRecipients,
  recipientAudience,
  SMS_CHANNELS,
  SmsPreview,
  smsTooLong,
} from './broadcast-fields';
import type { NotificationTemplate, SentNotification } from '@/hooks/use-notifications';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '@communityos/shared';
import { todayIST } from '@/lib/date';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Roles allowed to flip the "Urgent" toggle. Mirrors the role-gated
// visibility from the plan (NotifPlan §1).
const URGENT_ROLES = new Set([
  'super_admin',
  'community_admin',
  'committee_member',
]);

// Filter the shared catalog to "things an admin can choose to send
// from the admin web". Guard-only and admin-mobile-only categories
// stay out of the picker because the action handlers don't exist on
// the resident app, and broadcasting them from the admin web would
// just produce silent receipts.
const PICKABLE_CATEGORIES = Object.values(NOTIFICATION_CATEGORIES).filter(
  (c) =>
    c.audience.includes('resident') ||
    // Admin can also send staff_announcement and committee_escalation
    // via this composer; both have admin-mobile/guard audiences but no
    // resident audience. Keeping them visible so the admin can choose
    // them, even though the test-send may not render an action set on
    // a non-staff phone.
    c.id === 'staff_announcement' ||
    c.id === 'committee_escalation',
);

function channelIcon(channel: string): ReactNode {
  switch (channel) {
    case 'in_app':
      return <Inbox className="h-4 w-4 text-muted-foreground" />;
    case 'push':
      return <Smartphone className="h-4 w-4 text-blue-500" />;
    case 'email':
      return <Mail className="h-4 w-4 text-green-500" />;
    case 'both':
      return <Bell className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusVariant(
  status: string,
): 'success' | 'warning' | 'secondary' | 'destructive' {
  switch (status) {
    case 'sent':
      return 'success';
    case 'draft':
      return 'warning';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// Formats a category id from the shared contract into the title-cased
// label the picker shows. Falls back to the raw id if the catalog
// entry is missing (shouldn't happen in practice).
function categoryLabel(id: string | null | undefined): string {
  if (!id) return '—';
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Pulls the role the current user holds for the active tenant. Used
// to gate the urgent toggle. Returns null when the user / tenant
// can't be resolved (typically during the first paint before
// localStorage is hydrated).
function currentRole(): string | null {
  const user = getUser();
  if (!user) return null;
  if (user.isSuperAdmin) return 'super_admin';
  const tenantId = getCurrentTenant();
  if (!tenantId) return user.role ?? null;
  const tenancy = user.societies.find((s) => s.id === tenantId);
  return tenancy?.role ?? user.role ?? null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ActiveTab = 'compose' | 'sent';

export default function NotificationsContent(): ReactNode {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('compose');

  // Compose form state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeChannel, setComposeChannel] = useState('push');
  // ANN-08 — their recipients (and Staff in standard), one block for "… of Block".
  const [composeRecipient, setComposeRecipient] = useState('all');
  const [composeBlocks, setComposeBlocks] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const classic = useAdminLayout() === 'classic';
  const channelsQuery = useNotificationChannels();
  const smsAvailable = channelsQuery.data?.sms ?? false;
  const smsMax = channelsQuery.data?.sms_message_max ?? 120;
  const blockMaster = useUnitBlocks();
  const legacyBlocks = useBlocks();
  const allBlocks = blockMaster.data?.data?.map((block) => block.name) ?? legacyBlocks.data ?? [];
  const { audience: composeAudience, byBlock } = recipientAudience(composeRecipient);
  const isSms = SMS_CHANNELS.has(composeChannel);
  const audienceCount = useAudienceCount(composeAudience, composeBlocks, confirmOpen);

  // The dashboard's send-now tiles open the composer with a channel chosen
  // (`?compose=1&channel=sms_general|push`, ANN-09).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('channel');
    if (params.get('compose') === '1' && wanted) setComposeChannel(wanted);
  }, []);
  const [composeCategory, setComposeCategory] = useState<NotificationCategory | ''>('');
  const [composeUrgent, setComposeUrgent] = useState(false);
  const [composePromotional, setComposePromotional] = useState(false);
  // QA — staged template id (for the Test-send button to operate on
  // before the user confirms broadcast). Cleared after broadcast.
  const [stagedTemplateId, setStagedTemplateId] = useState<string | null>(null);
  // Confirmation dialog for the urgent toggle — bypassing mutes +
  // quiet hours is a foot-gun and the plan calls out an explicit
  // confirmation step.
  const [urgentConfirmOpen, setUrgentConfirmOpen] = useState(false);

  const role = useMemo(() => currentRole(), []);
  const canSendUrgent = role !== null && URGENT_ROLES.has(role);

  // Queries
  const templatesQuery = useNotificationTemplates();
  const sentQuery = useSentNotifications(50);

  // Mutations
  const createTemplateMutation = useCreateTemplate();
  const sendTemplateMutation = useSendTemplate();
  const testSendMutation = useTestSendTemplate();

  const templates = templatesQuery.data?.data ?? [];
  const sentList = sentQuery.data?.data ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function resetComposeForm(): void {
    setComposeTitle('');
    setComposeBody('');
    setComposeChannel('push');
    setComposeRecipient('all');
    setComposeBlocks([]);
    setComposeCategory('');
    setComposeUrgent(false);
    setComposePromotional(false);
    setStagedTemplateId(null);
  }

  function validate(): boolean {
    if (byBlock && composeBlocks.length === 0) {
      addToast({ title: 'Choose a block', variant: 'destructive' });
      return false;
    }
    if (isSms && smsTooLong(composeBody, smsMax)) {
      addToast({ title: `An SMS can be at most ${smsMax} characters`, variant: 'destructive' });
      return false;
    }
    if (!composeTitle.trim() && !(classic && composeChannel !== 'email')) {
      addToast({ title: 'Title is required', variant: 'destructive' });
      return false;
    }
    if (!composeBody.trim()) {
      addToast({ title: 'Message body is required', variant: 'destructive' });
      return false;
    }
    return true;
  }

  // Idempotent staging — if the user has already saved a template
  // (e.g. clicked Test-send), reuse the saved id instead of creating
  // duplicates. Returns the resolved template id, or null on failure.
  async function stageTemplate(): Promise<string | null> {
    if (stagedTemplateId) return stagedTemplateId;
    if (!validate()) return null;
    try {
      const res = await createTemplateMutation.mutateAsync({
        // Classic asks for a Subject only for Email; the inbox row needs a title.
        title: composeTitle.trim() || composeBody.trim().slice(0, 60),
        body: composeBody.trim(),
        channel: composeChannel,
        target_audience: composeAudience,
        ...(byBlock ? { target_blocks: composeBlocks } : {}),
        category: composeCategory || null,
        urgency: composeUrgent ? 'urgent' : 'normal',
        // Sent only when ticked, so an API before UNIT-37 sees the same request.
        ...(composePromotional ? { is_promotional: true } : {}),
      });
      const id = res.data.id;
      setStagedTemplateId(id);
      return id;
    } catch (error) {
      addToast({
        title: 'Failed to save template',
        description: friendlyError(error),
        variant: 'destructive',
      });
      return null;
    }
  }

  function handleSendNotification(): void {
    if (validate()) setConfirmOpen(true);
  }

  async function confirmSend(): Promise<void> {
    setConfirmOpen(false);
    const id = await stageTemplate();
    if (!id) return;
    sendTemplateMutation.mutate(id, {
      onSuccess(response) {
        addToast({
          title: `Notification queued (${response.data.sent} recipients)`,
          variant: 'success',
        });
        resetComposeForm();
      },
      onError(error) {
        addToast({
          title: 'Template saved but failed to send',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  async function handleTestSend(): Promise<void> {
    const id = await stageTemplate();
    if (!id) return;
    testSendMutation.mutate(id, {
      onSuccess() {
        addToast({
          title: 'Test push sent to your devices',
          description: 'Check the bell icon and your phone.',
          variant: 'success',
        });
      },
      onError(error) {
        addToast({
          title: 'Test send failed',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  function handleResend(template: NotificationTemplate): void {
    sendTemplateMutation.mutate(template.id, {
      onSuccess() {
        addToast({ title: `"${template.title}" resent`, variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to resend',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  // Urgent toggle confirmation. Closes the dialog and flips the flag
  // only if the admin confirms.
  function handleConfirmUrgent(): void {
    setComposeUrgent(true);
    setUrgentConfirmOpen(false);
    // Stage gets cleared so the next send re-saves the template with
    // urgency='urgent' (rather than reusing a 'normal' staged id).
    setStagedTemplateId(null);
  }

  // Preview the action set the recipient will see for the chosen
  // category. Reads from the shared contract directly so the preview
  // can never drift from runtime.
  const previewActions = useMemo(() => {
    if (!composeCategory) return null;
    const desc = NOTIFICATION_CATEGORIES[composeCategory];
    return desc?.actions ?? null;
  }, [composeCategory]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Notifications' }]}
        title="Notifications"
        description="Compose, schedule, and track notifications for society members"
        actions={
          activeTab === 'compose' ? (
            <ExportButton
              data={templates as unknown as Record<string, unknown>[]}
              filename={`notifications-${todayIST()}`}
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'channel', label: 'Channel' },
                { key: 'target_audience', label: 'Audience' },
                { key: 'category', label: 'Category' },
                { key: 'urgency', label: 'Urgency' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Created' },
              ]}
            />
          ) : null
        }
      />

      {/* Tab switcher — Compose | Sent (delivery scorecard). Same
          minimal pattern used on the bank + payments pages. */}
      <div className="border-b">
        <nav className="flex gap-6" aria-label="Tabs">
          {(
            [
              { key: 'compose' as const, label: 'Compose' },
              { key: 'sent' as const, label: 'Sent' },
            ]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'compose' ? (
        <>
          {/* Compose notification card */}
          <Card>
            <CardHeader>
              <CardTitle>{classic ? 'Broadcast message' : 'Compose Notification'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* ANN-S7: recipients first, channel second, message last. */}
                <BroadcastRecipients
                  recipient={composeRecipient}
                  blocks={composeBlocks}
                  allBlocks={allBlocks}
                  classic={classic}
                  onChange={(patch) => {
                    if (patch.recipient !== undefined) setComposeRecipient(patch.recipient);
                    if (patch.blocks !== undefined) setComposeBlocks(patch.blocks);
                    setStagedTemplateId(null);
                  }}
                />
                <BroadcastChannel
                  channel={composeChannel}
                  classic={classic}
                  smsAvailable={smsAvailable}
                  mayEssential={role === 'super_admin' || role === 'community_admin'}
                  onChange={(channel) => {
                    setComposeChannel(channel);
                    setStagedTemplateId(null);
                  }}
                />
                <BroadcastPromotional
                  checked={composePromotional}
                  onChange={(checked) => {
                    setComposePromotional(checked);
                    setStagedTemplateId(null);
                  }}
                />
                {(!classic || composeChannel === 'email') && (
                  <div className="space-y-2">
                    <Label htmlFor="notify-title">{composeChannel === 'email' ? 'Subject' : 'Title'}</Label>
                    <Input
                      id="notify-title"
                      value={composeTitle}
                      maxLength={200}
                      onChange={(e) => setComposeTitle(e.target.value)}
                      placeholder="e.g. Water Supply Disruption Notice"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notify-body">Message</Label>
                  <Textarea
                    id="notify-body"
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Write your notification message here..."
                    rows={4}
                  />
                  {isSms && <SmsPreview body={composeBody} max={smsMax} />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notify-category">Category</Label>
                    <Select
                      id="notify-category"
                      value={composeCategory}
                      onChange={(e) => {
                        setComposeCategory(
                          (e.target.value || '') as NotificationCategory | '',
                        );
                        setStagedTemplateId(null);
                      }}
                    >
                      <option value="">Generic announcement (no actions)</option>
                      {PICKABLE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {categoryLabel(cat.id)}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Drives the action buttons the recipient sees on
                      their phone (e.g. Approve / Deny on a visitor
                      request). Preview below.
                    </p>
                  </div>

                  {/* Urgent toggle — role-gated. Hidden entirely for
                      roles that can't send urgent so it doesn't even
                      appear as a disabled control. */}
                  {canSendUrgent && (
                    <div className="space-y-2">
                      <Label htmlFor="notify-urgent">Urgency</Label>
                      <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                        <input
                          id="notify-urgent"
                          type="checkbox"
                          className="rounded border-input"
                          checked={composeUrgent}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Open confirmation; only flip the flag
                              // if the admin confirms.
                              setUrgentConfirmOpen(true);
                            } else {
                              setComposeUrgent(false);
                              setStagedTemplateId(null);
                            }
                          }}
                        />
                        <div className="flex-1">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <AlertTriangle
                              className={`h-4 w-4 ${
                                composeUrgent ? 'text-destructive' : 'text-muted-foreground'
                              }`}
                            />
                            Urgent — bypass mutes + quiet hours
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Use for emergencies only.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-category preview pane. Reads action labels from
                    the shared contract so the admin sees exactly what
                    will render on the phone. */}
                {previewActions && previewActions.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Recipient will see these actions
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {previewActions.map((a) => (
                        <Badge
                          key={a.id}
                          variant={a.destructive ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {a.label}
                          {a.requiresBiometric ? ' · 🔒' : ''}
                          {a.inputPrompt ? ' · ✎' : ''}
                          {a.foreground ? '' : ' · silent'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {previewActions !== null && previewActions.length === 0 && (
                  <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    This category has no action buttons — recipients
                    just see the title and body.
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={handleTestSend}
                    disabled={
                      createTemplateMutation.isPending ||
                      testSendMutation.isPending
                    }
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    {testSendMutation.isPending ? 'Sending test…' : 'Test send to me'}
                  </Button>
                  <Button
                    onClick={handleSendNotification}
                    disabled={
                      createTemplateMutation.isPending ||
                      sendTemplateMutation.isPending ||
                      (isSms && smsTooLong(composeBody, smsMax))
                    }
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {(createTemplateMutation.isPending ||
                      sendTemplateMutation.isPending)
                      ? 'Sending...'
                      : 'Send Notification'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All saved templates table */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templatesQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : templates.length > 0 ? (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {channelIcon(template.channel)}
                            <span className="capitalize">{template.channel.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {template.target_audience.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{categoryLabel(template.category)}</TableCell>
                        <TableCell>
                          {template.urgency === 'urgent' ? (
                            <Badge variant="destructive">urgent</Badge>
                          ) : (
                            <span className="text-muted-foreground">normal</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(template.status)}>
                            {template.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.sent_at ? formatDate(template.sent_at) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleResend(template)}
                            disabled={sendTemplateMutation.isPending}
                            title="Resend"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No notifications sent yet. Use the compose form above to send your first notification.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        // ----- Sent tab -----
        <Card>
          <CardHeader>
            <CardTitle>Delivery Scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <Send className="h-3 w-3" /> Sent
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <CheckCheck className="h-3 w-3" /> Delivered
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Read
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Failed
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Skipped
                    </span>
                  </TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sentList.length > 0 ? (
                  sentList.map((row: SentNotification) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.urgency === 'urgent' ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                            {row.title}
                          </span>
                        ) : (
                          row.title
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {row.target_audience.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>{categoryLabel(row.category)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.sent_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.delivered_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.read_count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.failed_count > 0 ? (
                          <span className="text-destructive">{row.failed_count}</span>
                        ) : (
                          row.failed_count
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.skipped_count}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.sent_at ? formatDate(row.sent_at) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No deliveries logged yet. Send a notification from the Compose tab to populate this view.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <BroadcastConfirm
        open={confirmOpen}
        count={audienceCount.data}
        loading={audienceCount.isLoading}
        sending={createTemplateMutation.isPending || sendTemplateMutation.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void confirmSend()}
      />

      {/* Urgent confirmation dialog — explicit consent before
          bypassing recipient mute + quiet hours. */}
      <Dialog
        open={urgentConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setUrgentConfirmOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send as urgent?</DialogTitle>
            <DialogDescription>
              This bypasses recipient quiet hours and per-category
              mutes. Use only for emergencies (e.g. fire, water cut,
              unauthorised entry).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUrgentConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmUrgent}>
              Yes, send as urgent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
