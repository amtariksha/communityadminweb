'use client';

import { useState, type ReactNode } from 'react';
import { Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Super admin › Platform settings › OTP & Messaging, moved out of
// platform-settings.tsx unchanged (Q2).

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
// OTP & Messaging Tab
// ---------------------------------------------------------------------------

export function OtpSection({
  config,
  onSave,
  isPending,
}: {
  config: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  isPending: boolean;
}): ReactNode {
  // Nested config shape matches the backend's `platform_config.otp_provider`
  // value. Legacy `whatsapp` key is accepted as an alias for `whatsapp_cloud`.
  const waCfg = ((config.whatsapp_cloud as Record<string, unknown>) ??
    (config.whatsapp as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const msg91Cfg = (config.msg91 as Record<string, unknown>) ?? {};
  const twoFactorCfg = (config['2factor'] as Record<string, unknown>) ?? {};

  const [primaryChannel, setPrimaryChannel] = useState(
    (config.primary as string) ?? 'whatsapp',
  );
  const [smsProvider, setSmsProvider] = useState(
    (config.sms_provider as string) ?? '2factor',
  );

  // WhatsApp Cloud fields
  const [waPhoneNumberId, setWaPhoneNumberId] = useState(
    (waCfg.phoneNumberId as string) ?? '',
  );
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waTemplateName, setWaTemplateName] = useState(
    (waCfg.templateName as string) ?? 'otp_verification',
  );

  // MSG91 fields
  const [msg91AuthKey, setMsg91AuthKey] = useState('');
  const [msg91TemplateId, setMsg91TemplateId] = useState(
    (msg91Cfg.templateId as string) ?? '',
  );

  // 2Factor.in fields
  const [tfApiKeyHeader, setTfApiKeyHeader] = useState('');
  const [tfBaseUrl, setTfBaseUrl] = useState(
    (twoFactorCfg.baseUrl as string) ?? 'https://2factor.in/API/V1',
  );
  const [tfApiKey, setTfApiKey] = useState('');

  return (
    <div className="space-y-6">
      {/* --- Channel selection --- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Primary Channel</Label>
          <Select
            value={primaryChannel}
            onChange={(e) => setPrimaryChannel(e.target.value)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            First channel tried on /auth/send-otp. Falls back to the other on failure.
          </p>
        </div>
        <div className="space-y-2">
          <Label>SMS Provider</Label>
          <Select
            value={smsProvider}
            onChange={(e) => setSmsProvider(e.target.value)}
          >
            <option value="2factor">2Factor.in</option>
            <option value="msg91">MSG91</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Which adapter handles SMS sends. Fallback applies if the preferred
            provider isn't configured.
          </p>
        </div>
      </div>

      <Separator />

      {/* --- WhatsApp Cloud --- */}
      <h4 className="text-sm font-semibold">WhatsApp (Meta Cloud API)</h4>
      <div className="space-y-2">
        <Label>Phone Number ID</Label>
        <Input
          value={waPhoneNumberId}
          onChange={(e) => setWaPhoneNumberId(e.target.value)}
          placeholder="e.g. 123456789012345"
        />
      </div>
      <MaskedInput
        label="Access Token"
        value={waAccessToken}
        maskedDisplay={maskValue(waCfg.accessToken)}
        onChange={setWaAccessToken}
        type="password"
        placeholder="Meta access token (leave blank to keep existing)"
      />
      <div className="space-y-2">
        <Label>Template Name</Label>
        <Input
          value={waTemplateName}
          onChange={(e) => setWaTemplateName(e.target.value)}
          placeholder="otp_verification"
        />
      </div>

      <Separator />

      {/* --- 2Factor.in --- */}
      <h4 className="text-sm font-semibold">2Factor.in (SMS OTP)</h4>
      <MaskedInput
        label="API Key Header"
        value={tfApiKeyHeader}
        maskedDisplay={maskValue(twoFactorCfg.apiKeyHeader)}
        onChange={setTfApiKeyHeader}
        type="password"
        placeholder="api-key header value (leave blank to keep existing)"
      />
      <div className="space-y-2">
        <Label>Base URL</Label>
        <Input
          value={tfBaseUrl}
          onChange={(e) => setTfBaseUrl(e.target.value)}
          placeholder="https://2factor.in/API/V1"
        />
      </div>
      <MaskedInput
        label="Account API Key"
        value={tfApiKey}
        maskedDisplay={maskValue(twoFactorCfg.apiKey)}
        onChange={setTfApiKey}
        type="password"
        placeholder="per-account key in URL path (leave blank to keep existing)"
      />

      <Separator />

      {/* --- MSG91 --- */}
      <h4 className="text-sm font-semibold">MSG91 (SMS OTP — fallback)</h4>
      <MaskedInput
        label="Auth Key"
        value={msg91AuthKey}
        maskedDisplay={maskValue(msg91Cfg.authKey)}
        onChange={setMsg91AuthKey}
        type="password"
        placeholder="MSG91 auth key (leave blank to keep existing)"
      />
      <div className="space-y-2">
        <Label>Template ID</Label>
        <Input
          value={msg91TemplateId}
          onChange={(e) => setMsg91TemplateId(e.target.value)}
          placeholder="MSG91 template ID"
        />
      </div>

      <SaveButton
        isPending={isPending}
        onClick={() => {
          // Build nested payload. Secret fields are only written when the
          // admin has typed a new value — blank input preserves existing.
          const whatsappCloud: Record<string, unknown> = {
            phoneNumberId: waPhoneNumberId,
            templateName: waTemplateName,
          };
          if (waAccessToken) whatsappCloud.accessToken = waAccessToken;
          else if (waCfg.accessToken) whatsappCloud.accessToken = waCfg.accessToken;

          const msg91: Record<string, unknown> = { templateId: msg91TemplateId };
          if (msg91AuthKey) msg91.authKey = msg91AuthKey;
          else if (msg91Cfg.authKey) msg91.authKey = msg91Cfg.authKey;
          if (msg91Cfg.otpLength) msg91.otpLength = msg91Cfg.otpLength;

          const twoFactor: Record<string, unknown> = { baseUrl: tfBaseUrl };
          if (tfApiKeyHeader) twoFactor.apiKeyHeader = tfApiKeyHeader;
          else if (twoFactorCfg.apiKeyHeader)
            twoFactor.apiKeyHeader = twoFactorCfg.apiKeyHeader;
          if (tfApiKey) twoFactor.apiKey = tfApiKey;
          else if (twoFactorCfg.apiKey) twoFactor.apiKey = twoFactorCfg.apiKey;

          onSave({
            primary: primaryChannel,
            sms_provider: smsProvider,
            whatsapp_cloud: whatsappCloud,
            msg91,
            '2factor': twoFactor,
          });
        }}
      />
    </div>
  );
}

