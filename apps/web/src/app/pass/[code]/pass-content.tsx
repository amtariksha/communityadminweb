'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface PassData {
  tenant_name: string;
  visitor_name: string;
  qr_data_url: string;
  otp_code: string;
  valid_from?: string;
  valid_until: string;
  status: string;
  entries_used: number;
  max_entries: number;
  // Party/Group (#2): a host pass whose link self-registers each guest.
  invite_type?: string;
  unit_number?: string;
}

// Party/Group register response — ONLY the registering guest's own code/window.
interface GuestRegisterResult {
  guest_code: string;
  pass_url: string;
  qr_data_url: string;
  party_label: string;
  valid_from: string;
  valid_until: string;
}

type PassState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; data: PassData };

function getOverlayLabel(data: PassData): string | null {
  const now = new Date();
  const validUntil = new Date(data.valid_until);

  if (data.status === 'revoked') return 'REVOKED';
  if (data.status === 'expired' || validUntil < now) return 'EXPIRED';
  if (data.entries_used >= data.max_entries) return 'USED';
  return null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PassContent({ code }: { code: string }): ReactNode {
  const [state, setState] = useState<PassState>({ kind: 'loading' });

  useEffect(() => {
    async function fetchPass(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/gate/passes/${code}`);

        if (!response.ok) {
          setState({ kind: 'error', message: 'Pass not found or invalid' });
          return;
        }

        // The public endpoint wraps the pass as `{ data: <pass> }`; tolerate
        // either an enveloped or a bare body so the existing render path is
        // unaffected while `invite_type` (party_group) can still be read.
        const body = (await response.json()) as PassData | { data: PassData };
        const data =
          'data' in body && body.data != null
            ? (body.data as PassData)
            : (body as PassData);
        setState({ kind: 'loaded', data });
      } catch {
        setState({ kind: 'error', message: 'Pass not found or invalid' });
      }
    }

    fetchPass();
  }, [code]);

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-white" />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-400">{state.message}</p>
        </div>
      </div>
    );
  }

  const { data } = state;

  // Party/Group (#2): a single shared link that each guest self-registers
  // against to receive their OWN code. Every other invite type renders the
  // static pass card below, unchanged.
  if (data.invite_type === 'party_group') {
    return <PartyGuestRegister code={code} pass={data} />;
  }

  const overlayLabel = getOverlayLabel(data);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Pass Card */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Society Name */}
          <div className="border-b border-gray-800 px-6 py-4 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
              {data.tenant_name}
            </p>
          </div>

          {/* Pass Body */}
          <div className="flex flex-col items-center gap-5 px-6 py-6">
            <h1 className="text-xl font-semibold text-white">Visitor Pass</h1>

            {/* QR Code */}
            <div className="rounded-xl bg-white p-3">
              <img
                src={data.qr_data_url}
                alt="Visitor pass QR code"
                width={250}
                height={250}
                className="h-[250px] w-[250px]"
              />
            </div>

            {/* Visitor Name */}
            <p className="text-lg font-medium text-white">{data.visitor_name}</p>

            {/* OTP Code */}
            <div className="rounded-lg bg-gray-800 px-6 py-3">
              <p className="font-mono text-3xl font-bold tracking-[0.3em] text-white">
                {data.otp_code}
              </p>
            </div>

            {/* Valid Until */}
            <p className="text-sm text-gray-400">
              Valid until: {formatDate(data.valid_until)}
            </p>
          </div>

          {/* Status Overlay */}
          {overlayLabel !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <p
                className={`-rotate-12 rounded-lg border-4 px-8 py-3 text-4xl font-black tracking-wider ${
                  overlayLabel === 'USED'
                    ? 'border-yellow-500 text-yellow-500'
                    : 'border-red-500 text-red-500'
                }`}
              >
                {overlayLabel}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          Powered by Mera Ghar
        </p>
      </div>
    </div>
  );
}

type RegisterState =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'registered'; guest: GuestRegisterResult };

/**
 * Party/Group (#2) — a guest opens the host's shared link and self-registers
 * to receive their OWN passcode. Before submit: a small form. After submit:
 * the guest's own big/mono code to show at the gate. We render ONLY what the
 * register response returns — never other guests' codes or the unit number.
 */
function PartyGuestRegister({
  code,
  pass,
}: {
  code: string;
  pass: PassData;
}): ReactNode {
  const [state, setState] = useState<RegisterState>({ kind: 'form' });
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = guestName.trim();
    if (name.length === 0) {
      setError('Please enter your name');
      return;
    }

    setError(null);
    setState({ kind: 'submitting' });

    try {
      const phone = guestPhone.trim();
      const response = await fetch(
        `${API_BASE_URL}/gate/passes/${code}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guest_name: name,
            ...(phone.length > 0 ? { guest_phone: phone } : {}),
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { data?: GuestRegisterResult; message?: string | string[] }
        | null;

      if (!response.ok) {
        const rawMessage = body?.message;
        const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
        setError(message ?? 'Could not register. Please try again.');
        setState({ kind: 'form' });
        return;
      }

      const guest = body?.data;
      if (!guest) {
        setError('Could not register. Please try again.');
        setState({ kind: 'form' });
        return;
      }

      setState({ kind: 'registered', guest });
    } catch {
      setError('Could not register. Please try again.');
      setState({ kind: 'form' });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Society Name */}
          <div className="border-b border-gray-800 px-6 py-4 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
              {pass.tenant_name}
            </p>
          </div>

          {/* Party header — read-only label + window */}
          <div className="border-b border-gray-800 px-6 py-5 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              You are invited to
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">
              {pass.visitor_name}
            </h1>
            {pass.valid_from !== undefined && (
              <p className="mt-2 text-xs text-gray-400">
                {formatDate(pass.valid_from)}
              </p>
            )}
            <p className="text-xs text-gray-400">
              {pass.valid_from !== undefined ? 'until ' : 'Valid until: '}
              {formatDate(pass.valid_until)}
            </p>
          </div>

          {state.kind === 'registered' ? (
            <GuestPass guest={state.guest} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 px-6 py-6"
            >
              <p className="text-center text-sm text-gray-300">
                Register to get your entry pass
              </p>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="guest_name"
                  className="text-xs font-medium text-gray-400"
                >
                  Your name
                </label>
                <input
                  id="guest_name"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  maxLength={200}
                  autoComplete="name"
                  disabled={state.kind === 'submitting'}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gray-500 disabled:opacity-60"
                  placeholder="Full name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="guest_phone"
                  className="text-xs font-medium text-gray-400"
                >
                  Phone <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  id="guest_phone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  maxLength={20}
                  autoComplete="tel"
                  disabled={state.kind === 'submitting'}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gray-500 disabled:opacity-60"
                  placeholder="Phone number"
                />
              </div>

              {error !== null && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={state.kind === 'submitting'}
                className="mt-1 flex items-center justify-center rounded-lg bg-white px-4 py-2.5 font-medium text-gray-950 transition hover:bg-gray-200 disabled:opacity-60"
              >
                {state.kind === 'submitting' ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-gray-950" />
                ) : (
                  'Get my pass'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          Powered by Mera Ghar
        </p>
      </div>
    </div>
  );
}

/**
 * The registered guest's own pass — a scannable QR of the guest's pass URL
 * plus the 6-digit code to read out if the guard types it instead.
 */
function GuestPass({ guest }: { guest: GuestRegisterResult }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-6">
      <h2 className="text-lg font-semibold text-white">Your entry pass</h2>

      {guest.qr_data_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guest.qr_data_url}
          alt="Your gate pass QR code"
          className="h-56 w-56 rounded-lg bg-white p-2"
        />
      ) : null}

      <div className="w-full rounded-lg bg-gray-800 px-6 py-5 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          Show this at the gate
        </p>
        <p className="mt-2 font-mono text-4xl font-bold tracking-[0.3em] text-white">
          {guest.guest_code}
        </p>
      </div>

      <p className="text-center text-xs text-gray-500">
        Valid until: {formatDate(guest.valid_until)}
      </p>
    </div>
  );
}
