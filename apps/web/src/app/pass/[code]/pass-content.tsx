'use client';

import { useEffect, useState, type ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface PassData {
  tenant_name: string;
  visitor_name: string;
  qr_data_url: string;
  otp_code: string;
  valid_until: string;
  status: string;
  entries_used: number;
  max_entries: number;
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

        const data = (await response.json()) as PassData;
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
          Powered by CommunityOS
        </p>
      </div>
    </div>
  );
}
