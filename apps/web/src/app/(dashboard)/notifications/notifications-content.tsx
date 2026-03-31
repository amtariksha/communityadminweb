'use client';

import { useState, type ReactNode } from 'react';
import {
  Send,
  Bell,
  Mail,
  Smartphone,
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
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useNotificationTemplates,
  useCreateTemplate,
  useSendTemplate,
} from '@/hooks';
import type { NotificationTemplate } from '@/hooks/use-notifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANNELS = [
  { value: 'push', label: 'Push Notification' },
  { value: 'email', label: 'Email' },
  { value: 'both', label: 'Push + Email' },
] as const;

const TARGET_AUDIENCES = [
  { value: 'all_members', label: 'All Members' },
  { value: 'owners_only', label: 'Owners Only' },
  { value: 'tenants_only', label: 'Tenants Only' },
  { value: 'committee_only', label: 'Committee Only' },
  { value: 'staff_only', label: 'Staff Only' },
] as const;

function channelIcon(channel: string): ReactNode {
  switch (channel) {
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NotificationsContent(): ReactNode {
  const { addToast } = useToast();

  // Compose form state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeChannel, setComposeChannel] = useState('push');
  const [composeAudience, setComposeAudience] = useState('all_members');

  // Queries
  const templatesQuery = useNotificationTemplates();

  // Mutations
  const createTemplateMutation = useCreateTemplate();
  const sendTemplateMutation = useSendTemplate();

  const templates = templatesQuery.data?.data ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSendNotification(): void {
    if (!composeTitle.trim()) {
      addToast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!composeBody.trim()) {
      addToast({ title: 'Message body is required', variant: 'destructive' });
      return;
    }

    createTemplateMutation.mutate(
      {
        title: composeTitle.trim(),
        body: composeBody.trim(),
        channel: composeChannel,
        target_audience: composeAudience,
      },
      {
        onSuccess(response) {
          const templateId = response.data.id;
          // Auto-send after creation
          sendTemplateMutation.mutate(templateId, {
            onSuccess() {
              addToast({ title: 'Notification sent', variant: 'success' });
              setComposeTitle('');
              setComposeBody('');
              setComposeChannel('push');
              setComposeAudience('all_members');
            },
            onError(error) {
              addToast({
                title: 'Template created but failed to send',
                description: error.message,
                variant: 'destructive',
              });
            },
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to create notification',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleResend(template: NotificationTemplate): void {
    sendTemplateMutation.mutate(template.id, {
      onSuccess() {
        addToast({ title: `"${template.title}" resent`, variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to resend', description: error.message, variant: 'destructive' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Notifications' }]}
        title="Notifications"
        description="Compose and manage notifications for society members"
        actions={
          <ExportButton
            data={templates as unknown as Record<string, unknown>[]}
            filename={`notifications-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'channel', label: 'Channel' },
              { key: 'target_audience', label: 'Audience' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Created' },
            ]}
          />
        }
      />

      {/* Compose notification card */}
      <Card>
        <CardHeader>
          <CardTitle>Compose Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify-title">Title</Label>
              <Input
                id="notify-title"
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder="e.g. Water Supply Disruption Notice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify-body">Message</Label>
              <Textarea
                id="notify-body"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your notification message here..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notify-channel">Channel</Label>
                <Select
                  id="notify-channel"
                  value={composeChannel}
                  onChange={(e) => setComposeChannel(e.target.value)}
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>{ch.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notify-audience">Target Audience</Label>
                <Select
                  id="notify-audience"
                  value={composeAudience}
                  onChange={(e) => setComposeAudience(e.target.value)}
                >
                  {TARGET_AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSendNotification}
                disabled={createTemplateMutation.isPending || sendTemplateMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {(createTemplateMutation.isPending || sendTemplateMutation.isPending)
                  ? 'Sending...'
                  : 'Send Notification'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sent notifications table */}
      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
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
                        <span className="capitalize">{template.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {template.target_audience.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(template.status)}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.sent_at ? formatDate(template.sent_at) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.creator_name ?? '-'}
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
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No notifications sent yet. Use the compose form above to send your first notification.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
