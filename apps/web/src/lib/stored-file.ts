import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';

/**
 * Stored files live in a private bucket: a file's raw address (file_url,
 * photo_url, images[], logo_url, ...) opens nothing on its own. Every
 * picture and every "open" goes through a short-lived link the API signs
 * (POST /upload/download-url). The rules, from the API's contract:
 *   - 201 → the signed link, kept until its expiry less five minutes.
 *   - 404 `file_not_found` → the file is not available to this person (null).
 *   - 400 `file_url_not_ours` → not one of our files: the raw address as is.
 *   - anything else (older API, network) → the raw address, as before.
 *   - a value that is not an http(s) address (data:, blob:, /logo.svg) is used
 *     as it is, with no call.
 * Links are kept in memory only, and one request serves every caller asking
 * for the same file at once.
 */

export type FileDisposition = 'inline' | 'attachment';

export interface StoredFileOptions {
  /** 'inline' (default) shows the file in the browser; 'attachment' downloads it. */
  disposition?: FileDisposition;
  /** The name the browser gives a downloaded file. */
  fileName?: string;
  /** Sign under this society instead of the selected one (a super admin's view of a society). */
  tenantId?: string;
}

/** A file known only by its storage key (vendor and purchase attachments). */
export interface StoredFileKey {
  key: string;
}

export type StoredFileSource = string | StoredFileKey;

interface DownloadUrlResponse {
  data?: { downloadUrl?: string; expiresAt?: string };
}

type Outcome =
  | { kind: 'signed'; url: string; validUntil: number }
  | { kind: 'not_ours' }
  | { kind: 'unavailable' }
  | { kind: 'failed'; error: unknown };

const ROUTE = '/upload/download-url';
const REFRESH_MARGIN_MS = 5 * 60_000;
const DEFAULT_LIFETIME_MS = 45 * 60_000;
const WEB_ADDRESS = /^https?:\/\//i;

const links = new Map<string, { url: string; validUntil: number }>();
const pending = new Map<string, Promise<string | null>>();

/** Whether a value is an http(s) address the API may sign. */
export function isSignableUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && WEB_ADDRESS.test(value.trim());
}

function cacheKey(kind: 'url' | 'key', source: string, options: StoredFileOptions): string {
  const tenant = options.tenantId || getCurrentTenant() || '';
  return JSON.stringify([kind, tenant, source, options.disposition ?? 'inline', options.fileName ?? '']);
}

function cached(key: string): string | undefined {
  const hit = links.get(key);
  if (!hit) return undefined;
  if (hit.validUntil > Date.now()) return hit.url;
  links.delete(key);
  return undefined;
}

function remember(key: string, url: string, validUntil: number): void {
  if (validUntil > Date.now()) links.set(key, { url, validUntil });
}

function validUntil(expiresAt: string | undefined): number {
  const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  return Number.isFinite(expiry) ? expiry - REFRESH_MARGIN_MS : Date.now() + DEFAULT_LIFETIME_MS;
}

function classify(error: unknown): Outcome {
  if (error instanceof ApiError && error.code === 'file_not_found') return { kind: 'unavailable' };
  if (error instanceof ApiError && error.code === 'file_url_not_ours') return { kind: 'not_ours' };
  return { kind: 'failed', error };
}

async function requestLink(body: Record<string, string | undefined>, options: StoredFileOptions): Promise<Outcome> {
  try {
    const response = await api.post<DownloadUrlResponse>(
      ROUTE,
      { ...body, disposition: options.disposition ?? 'inline', file_name: options.fileName },
      options.tenantId ? { headers: { 'x-tenant-id': options.tenantId } } : undefined,
    );
    const url = response?.data?.downloadUrl;
    if (!url) return { kind: 'failed', error: new Error('The file link was missing from the response') };
    return { kind: 'signed', url, validUntil: validUntil(response.data?.expiresAt) };
  } catch (error) {
    return classify(error);
  }
}

function once(key: string, work: () => Promise<string | null>): Promise<string | null> {
  const running = pending.get(key);
  if (running) return running;
  const started = work().finally(() => pending.delete(key));
  pending.set(key, started);
  return started;
}

/** The link already held for a file (no request), the value itself when it needs none, else undefined. */
export function peekStoredFileLink(rawUrl: string, options: StoredFileOptions = {}): string | undefined {
  if (!isSignableUrl(rawUrl)) return rawUrl;
  return cached(cacheKey('url', rawUrl, options));
}

/** A link that opens the stored file: signed, the raw address (see the rules above), or null when not available. */
export async function storedFileLink(rawUrl: string, options: StoredFileOptions = {}): Promise<string | null> {
  if (!isSignableUrl(rawUrl)) return rawUrl;
  const key = cacheKey('url', rawUrl, options);
  const hit = cached(key);
  if (hit) return hit;
  return once(key, async () => {
    const outcome = await requestLink({ file_url: rawUrl }, options);
    if (outcome.kind === 'signed') {
      remember(key, outcome.url, outcome.validUntil);
      return outcome.url;
    }
    if (outcome.kind === 'unavailable') return null;
    if (outcome.kind === 'not_ours') remember(key, rawUrl, Date.now() + DEFAULT_LIFETIME_MS);
    return rawUrl;
  });
}

/**
 * The signed link of a file known by its storage key, or null when not
 * available. With no raw address to fall back on, any other failure throws.
 */
export async function storedFileLinkByKey(fileKey: string, options: StoredFileOptions = {}): Promise<string | null> {
  const key = cacheKey('key', fileKey, options);
  const hit = cached(key);
  if (hit) return hit;
  return once(key, async () => {
    const outcome = await requestLink({ key: fileKey }, options);
    if (outcome.kind === 'signed') {
      remember(key, outcome.url, outcome.validUntil);
      return outcome.url;
    }
    if (outcome.kind === 'unavailable') return null;
    throw outcome.kind === 'failed' ? outcome.error : new Error('The file could not be opened');
  });
}

function linkFor(source: StoredFileSource, options: StoredFileOptions): Promise<string | null> {
  return typeof source === 'string' ? storedFileLink(source, options) : storedFileLinkByKey(source.key, options);
}

/**
 * Opens a stored file in a new tab. Resolves false when the file is not
 * available, so the caller can say so (useOpenStoredFile does).
 *
 * Call it straight from the click, before any await: the tab is opened at
 * once, inside the click (Safari's popup blocker refuses a window opened
 * after an await), and sent to the file when its link arrives — or closed
 * again when the file is not available. When even that tab is blocked, the
 * file opens in this tab.
 */
export async function openStoredFile(source: StoredFileSource, options: StoredFileOptions = {}): Promise<boolean> {
  const held = typeof source === 'string' ? peekStoredFileLink(source, options) : undefined;
  if (held) {
    window.open(held, '_blank', 'noopener,noreferrer');
    return true;
  }
  const tab = openWaitingTab();
  let link: string | null;
  try {
    link = await linkFor(source, options);
  } catch (error) {
    tab?.close();
    throw error;
  }
  if (!link) {
    tab?.close();
    return false;
  }
  if (tab) tab.location.replace(link);
  else window.location.assign(link);
  return true;
}

/** An empty tab, opened inside the click, that the file's page gets no handle back from. */
function openWaitingTab(): Window | null {
  const tab = window.open('', '_blank');
  if (!tab) return null;
  // What 'noopener' does for a tab opened at its address (a record may link to another site).
  tab.opener = null;
  return tab;
}

/** Forgets every link held (tests). */
export function forgetStoredFileLinks(): void {
  links.clear();
  pending.clear();
}
