'use client';

import { useState, useEffect, type ReactNode } from 'react';
import {
  HardDrive,
  MessageSquare,
  CreditCard,
  Bell,
  Mail,
  Palette,
  Save,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  usePlatformConfig,
  useUpdatePlatformConfig,
} from '@/hooks';
import type { PlatformConfigItem } from '@/hooks';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type SettingsTab = 'storage' | 'otp' | 'payments' | 'push' | 'email' | 'branding';

const TABS: { key: SettingsTab; label: string; icon: typeof HardDrive }[] = [
  { key: 'storage', label: 'Storage', icon: HardDrive },
  { key: 'otp', label: 'OTP & Messaging', icon: MessageSquare },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'push', label: 'Push Notifications', icon: Bell },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'branding', label: 'Branding', icon: Palette },
];

// ---------------------------------------------------------------------------
// Config key mapping
// ---------------------------------------------------------------------------

const TAB_CONFIG_KEYS: Record<SettingsTab, string> = {
  storage: 'storage',
  otp: 'otp_messaging',
  payments: 'payments',
  push: 'push_notifications',
  email: 'email',
  branding: 'branding',
};

// ---------------------------------------------------------------------------
// Secret field helper
// ---------------------------------------------------------------------------

function maskValue(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

// ---------------------------------------------------------------------------
// MaskedInput — shows masked value, reveals on edit
// ---------------------------------------------------------------------------

function MaskedInput({
  label,
  value,
  maskedDisplay,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  maskedDisplay?: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}): ReactNode {
  const [revealed, setRevealed] = useState(false);
  const isMasked = maskedDisplay && !revealed && value === '';

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">{label}</Label>
      <div className="relative">
        <Input
          type={revealed || !isMasked ? type : 'password'}
          placeholder={isMasked ? maskedDisplay : placeholder}
          value={isMasked ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (isMasked) setRevealed(true);
          }}
        />
        {maskedDisplay && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Save Button
// ---------------------------------------------------------------------------

function SaveButton({
  isPending,
  onClick,
}: {
  isPending: boolean;
  onClick: () => void;
}): ReactNode {
  return (
    <div className="flex justify-end pt-4">
      <Button onClick={onClick} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storage Tab
// ---------------------------------------------------------------------------

function StorageSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  const [provider, setProvider] = useState((config.provider as string) ?? 's3');
  const [bucket, setBucket] = useState((config.bucket as string) ?? '');
  const [region, setRegion] = useState((config.region as string) ?? '');
  const [accountId, setAccountId] = useState((config.account_id as string) ?? '');
  const [endpoint, setEndpoint] = useState((config.endpoint as string) ?? '');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="s3">AWS S3</option>
          <option value="r2">Cloudflare R2</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Bucket Name</Label>
        <Input
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          placeholder="my-bucket"
        />
      </div>

      {provider === 's3' && (
        <div className="space-y-2">
          <Label>Region</Label>
          <Input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="ap-south-1"
          />
        </div>
      )}

      {provider === 'r2' && (
        <>
          <div className="space-y-2">
            <Label>Account ID</Label>
            <Input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Cloudflare Account ID"
            />
          </div>
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://<account_id>.r2.cloudflarestorage.com"
            />
          </div>
        </>
      )}

      <MaskedInput
        label="Access Key ID"
        value={accessKeyId}
        maskedDisplay={maskValue(config.access_key_id)}
        onChange={setAccessKeyId}
        placeholder="AKIA..."
      />

      <MaskedInput
        label="Secret Access Key"
        value={secretAccessKey}
        maskedDisplay={maskValue(config.secret_access_key)}
        onChange={setSecretAccessKey}
        type="password"
        placeholder="Secret key"
      />

      <SaveButton
        isPending={isPending}
        onClick={() => {
          const value: Record<string, unknown> = {
            provider,
            bucket,
            ...(provider === 's3' ? { region } : { account_id: accountId, endpoint }),
          };
          if (accessKeyId) value.access_key_id = accessKeyId;
          if (secretAccessKey) value.secret_access_key = secretAccessKey;
          onSave(value);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// OTP & Messaging Tab
// ---------------------------------------------------------------------------

function OtpSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  const [defaultChannel, setDefaultChannel] = useState(
    (config.default_channel as string) ?? 'whatsapp',
  );
  const [waPhoneNumberId, setWaPhoneNumberId] = useState(
    (config.whatsapp_phone_number_id as string) ?? '',
  );
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waTemplateName, setWaTemplateName] = useState(
    (config.whatsapp_template_name as string) ?? '',
  );
  const [smsAuthKey, setSmsAuthKey] = useState('');
  const [smsTemplateId, setSmsTemplateId] = useState(
    (config.sms_template_id as string) ?? '',
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Default Channel</Label>
        <Select value={defaultChannel} onChange={(e) => setDefaultChannel(e.target.value)}>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </Select>
      </div>

      <Separator />

      <h4 className="text-sm font-semibold">WhatsApp (Meta Cloud API)</h4>
      <div className="space-y-2">
        <Label>Phone Number ID</Label>
        <Input
          value={waPhoneNumberId}
          onChange={(e) => setWaPhoneNumberId(e.target.value)}
          placeholder="Phone Number ID from Meta"
        />
      </div>
      <MaskedInput
        label="Access Token"
        value={waAccessToken}
        maskedDisplay={maskValue(config.whatsapp_access_token)}
        onChange={setWaAccessToken}
        type="password"
        placeholder="Meta access token"
      />
      <div className="space-y-2">
        <Label>Template Name</Label>
        <Input
          value={waTemplateName}
          onChange={(e) => setWaTemplateName(e.target.value)}
          placeholder="otp_template"
        />
      </div>

      <Separator />

      <h4 className="text-sm font-semibold">SMS (MSG91)</h4>
      <MaskedInput
        label="Auth Key"
        value={smsAuthKey}
        maskedDisplay={maskValue(config.sms_auth_key)}
        onChange={setSmsAuthKey}
        type="password"
        placeholder="MSG91 Auth Key"
      />
      <div className="space-y-2">
        <Label>Template ID</Label>
        <Input
          value={smsTemplateId}
          onChange={(e) => setSmsTemplateId(e.target.value)}
          placeholder="MSG91 Template ID"
        />
      </div>

      <SaveButton
        isPending={isPending}
        onClick={() => {
          const value: Record<string, unknown> = {
            default_channel: defaultChannel,
            whatsapp_phone_number_id: waPhoneNumberId,
            whatsapp_template_name: waTemplateName,
            sms_template_id: smsTemplateId,
          };
          if (waAccessToken) value.whatsapp_access_token = waAccessToken;
          if (smsAuthKey) value.sms_auth_key = smsAuthKey;
          onSave(value);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payments Tab
// ---------------------------------------------------------------------------

function PaymentsSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  const [keyId, setKeyId] = useState((config.razorpay_key_id as string) ?? '');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [platformFee, setPlatformFee] = useState(
    String(config.platform_fee_percent ?? ''),
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Razorpay</h4>
      <div className="space-y-2">
        <Label>Key ID</Label>
        <Input
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
          placeholder="rzp_live_..."
        />
      </div>
      <MaskedInput
        label="Key Secret"
        value={keySecret}
        maskedDisplay={maskValue(config.razorpay_key_secret)}
        onChange={setKeySecret}
        type="password"
        placeholder="Razorpay secret"
      />
      <MaskedInput
        label="Webhook Secret"
        value={webhookSecret}
        maskedDisplay={maskValue(config.razorpay_webhook_secret)}
        onChange={setWebhookSecret}
        type="password"
        placeholder="Webhook signing secret"
      />
      <div className="space-y-2">
        <Label>Platform Fee %</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={platformFee}
          onChange={(e) => setPlatformFee(e.target.value)}
          placeholder="e.g., 2.5"
        />
      </div>

      <SaveButton
        isPending={isPending}
        onClick={() => {
          const value: Record<string, unknown> = {
            razorpay_key_id: keyId,
            platform_fee_percent: platformFee ? Number(platformFee) : undefined,
          };
          if (keySecret) value.razorpay_key_secret = keySecret;
          if (webhookSecret) value.razorpay_webhook_secret = webhookSecret;
          onSave(value);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Push Notifications Tab
// ---------------------------------------------------------------------------

function PushSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  const [projectId, setProjectId] = useState(
    (config.firebase_project_id as string) ?? '',
  );
  const [clientEmail, setClientEmail] = useState(
    (config.firebase_client_email as string) ?? '',
  );
  const [privateKey, setPrivateKey] = useState('');

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Firebase Cloud Messaging</h4>
      <div className="space-y-2">
        <Label>Project ID</Label>
        <Input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="my-firebase-project"
        />
      </div>
      <div className="space-y-2">
        <Label>Client Email</Label>
        <Input
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="firebase-adminsdk@project.iam.gserviceaccount.com"
        />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          Private Key
          {config.firebase_private_key && (
            <span className="text-xs text-muted-foreground">(currently set)</span>
          )}
        </Label>
        <Textarea
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
          rows={4}
        />
      </div>

      <SaveButton
        isPending={isPending}
        onClick={() => {
          const value: Record<string, unknown> = {
            firebase_project_id: projectId,
            firebase_client_email: clientEmail,
          };
          if (privateKey) value.firebase_private_key = privateKey;
          onSave(value);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Tab
// ---------------------------------------------------------------------------

function EmailSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  const [provider, setProvider] = useState((config.provider as string) ?? 'ses');
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState((config.from_email as string) ?? '');
  const [fromName, setFromName] = useState((config.from_name as string) ?? '');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="ses">AWS SES</option>
          <option value="resend">Resend</option>
        </Select>
      </div>
      <MaskedInput
        label="API Key"
        value={apiKey}
        maskedDisplay={maskValue(config.api_key)}
        onChange={setApiKey}
        type="password"
        placeholder="API key"
      />
      <div className="space-y-2">
        <Label>From Email</Label>
        <Input
          type="email"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="noreply@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label>From Name</Label>
        <Input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="CommunityOS"
        />
      </div>

      <SaveButton
        isPending={isPending}
        onClick={() => {
          const value: Record<string, unknown> = {
            provider,
            from_email: fromEmail,
            from_name: fromName,
          };
          if (apiKey) value.api_key = apiKey;
          onSave(value);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branding Tab
// ---------------------------------------------------------------------------

function BrandingSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  const [appName, setAppName] = useState((config.app_name as string) ?? '');
  const [logoUrl, setLogoUrl] = useState((config.logo_url as string) ?? '');
  const [primaryColor, setPrimaryColor] = useState(
    (config.primary_color as string) ?? '#4f46e5',
  );
  const [supportEmail, setSupportEmail] = useState(
    (config.support_email as string) ?? '',
  );
  const [supportPhone, setSupportPhone] = useState(
    (config.support_phone as string) ?? '',
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>App Name</Label>
        <Input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="CommunityOS"
        />
      </div>
      <div className="space-y-2">
        <Label>Logo URL</Label>
        <Input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>
      <div className="space-y-2">
        <Label>Primary Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border border-input"
          />
          <Input
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#4f46e5"
            className="flex-1"
          />
        </div>
      </div>

      <Separator />

      <h4 className="text-sm font-semibold">Support Contact</h4>
      <div className="space-y-2">
        <Label>Support Email</Label>
        <Input
          type="email"
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
          placeholder="support@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label>Support Phone</Label>
        <Input
          value={supportPhone}
          onChange={(e) => setSupportPhone(e.target.value)}
          placeholder="+91XXXXXXXXXX"
        />
      </div>

      <SaveButton
        isPending={isPending}
        onClick={() =>
          onSave({
            app_name: appName,
            logo_url: logoUrl,
            primary_color: primaryColor,
            support_email: supportEmail,
            support_phone: supportPhone,
          })
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PlatformSettings(): ReactNode {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('storage');

  const configQuery = usePlatformConfig();
  const updateConfig = useUpdatePlatformConfig();

  // Build a map from config key to value
  const configMap: Record<string, Record<string, unknown>> = {};
  if (configQuery.data) {
    for (const item of configQuery.data) {
      configMap[item.key] = (item.value ?? {}) as Record<string, unknown>;
    }
  }

  function handleSave(tabKey: SettingsTab, value: Record<string, unknown>): void {
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

  function getConfigForTab(tab: SettingsTab): Record<string, unknown> {
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
          {activeTab === 'storage' && (
            <StorageSection
              config={getConfigForTab('storage')}
              onSave={(v) => handleSave('storage', v)}
              isPending={updateConfig.isPending}
            />
          )}
          {activeTab === 'otp' && (
            <OtpSection
              config={getConfigForTab('otp')}
              onSave={(v) => handleSave('otp', v)}
              isPending={updateConfig.isPending}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsSection
              config={getConfigForTab('payments')}
              onSave={(v) => handleSave('payments', v)}
              isPending={updateConfig.isPending}
            />
          )}
          {activeTab === 'push' && (
            <PushSection
              config={getConfigForTab('push')}
              onSave={(v) => handleSave('push', v)}
              isPending={updateConfig.isPending}
            />
          )}
          {activeTab === 'email' && (
            <EmailSection
              config={getConfigForTab('email')}
              onSave={(v) => handleSave('email', v)}
              isPending={updateConfig.isPending}
            />
          )}
          {activeTab === 'branding' && (
            <BrandingSection
              config={getConfigForTab('branding')}
              onSave={(v) => handleSave('branding', v)}
              isPending={updateConfig.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
