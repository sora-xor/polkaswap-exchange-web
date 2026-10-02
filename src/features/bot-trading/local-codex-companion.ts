import type { DesktopAiContext } from './desktop-ai';
import type { DiscoveryDraftContext } from './discovery-provider';

/** The companion accepts public training data only; this client has no wallet or execution methods. */
export interface LocalCodexCompanion {
  pair(code: string, signal: AbortSignal): Promise<void>;
  draft(
    context: DesktopAiContext,
    signal: AbortSignal
  ): Promise<{ requestId: string; strategy: unknown } | { requestId: string; strategies: unknown }>;
  discoveryDraft(
    context: DiscoveryDraftContext,
    provider: 'codex' | 'claude-code',
    signal: AbortSignal
  ): Promise<{ requestId: string; strategy: unknown }>;
  disconnect(): void;
}

export type LocalCodexCompanionError = 'unavailable' | 'unauthorized' | 'draftFailed' | 'usageLimit';
export class CompanionRequestError extends Error {
  constructor(readonly reason: LocalCodexCompanionError) {
    super(reason);
  }
}

const ORIGIN = 'http://127.0.0.1:39847';
const PAIR_CODE = /^[0-9a-fA-F]{32}$/;
const BEARER = /^[0-9a-fA-F]{64}$/;
const MAX_RESPONSE_LENGTH = 32_768;
const MIN_RETRY_WINDOW_MS = 30_000;
const DRAFT_RETRY_DELAYS_MS = [1_000, 3_000] as const;

/** Reject unexpected response shapes without rendering local process errors in the page. */
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CompanionRequestError('unavailable');
  return value as Record<string, unknown>;
}

/** Read at most 32 KiB even when a local process lies about Content-Length. */
async function responseObject(response: Response): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new CompanionRequestError('unavailable');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_LENGTH) {
        void reader.cancel().catch(() => undefined);
        throw new CompanionRequestError('unavailable');
      }
      chunks.push(value);
    }
  } catch {
    throw new CompanionRequestError('unavailable');
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  } catch {
    throw new CompanionRequestError('unavailable');
  }
}

/** Only a fixed model-draft failure can be retried; transport, auth and protocol failures need attention. */
async function retryableDraftFailure(response: Response): Promise<boolean> {
  if (response.status !== 502) return false;
  try {
    const result = await responseObject(response);
    return Object.keys(result).length === 1 && result.error === 'draft_failed';
  } catch {
    return false;
  }
}

/** Recognize only the companion's fixed quota response; never surface an arbitrary local error. */
async function usageLimitResponse(response: Response): Promise<boolean> {
  if (response.status !== 429) return false;
  try {
    const result = await responseObject(response);
    return Object.keys(result).length === 1 && result.error === 'usage_limit';
  } catch {
    return false;
  }
}

/** Pause between model failures, releasing the wait as soon as the page cancels the request. */
async function waitForDraftRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new CompanionRequestError('unavailable');
  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(new CompanionRequestError('unavailable'));
    };
    timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

/** Pair once by an explicit user action, then send only each prepared public context. */
export function createLocalCodexCompanion(): LocalCodexCompanion {
  let token = '';
  let expiresAt = 0;
  let disconnected = false;

  const request = async (
    path: '/pair' | '/draft' | '/discovery/draft',
    body: unknown,
    signal: AbortSignal
  ): Promise<Response> => {
    if (disconnected || signal.aborted) throw new CompanionRequestError('unavailable');
    try {
      return await fetch(`${ORIGIN}${path}`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        headers: {
          'Content-Type': 'application/json',
          ...(path !== '/pair' ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch {
      throw new CompanionRequestError('unavailable');
    }
  };

  return {
    async pair(code, signal) {
      if (!PAIR_CODE.test(code)) throw new CompanionRequestError('unauthorized');
      const response = await request('/pair', { code }, signal);
      if (!response.ok) throw new CompanionRequestError(response.status === 401 ? 'unauthorized' : 'unavailable');
      const result = await responseObject(response);
      if (
        typeof result.token !== 'string' ||
        !BEARER.test(result.token) ||
        !Number.isSafeInteger(result.expiresAt) ||
        (result.expiresAt as number) <= Date.now() ||
        disconnected ||
        signal.aborted
      )
        throw new CompanionRequestError('unavailable');
      token = result.token;
      expiresAt = result.expiresAt as number;
    },
    async draft(context, signal) {
      if (!token || Date.now() >= expiresAt) {
        token = '';
        throw new CompanionRequestError('unauthorized');
      }
      const body = { context };
      const retryDeadline = Math.min(expiresAt, context.expiresAt);
      let response = await request('/draft', body, signal);
      for (const delayMs of DRAFT_RETRY_DELAYS_MS) {
        if (
          !(await retryableDraftFailure(response)) ||
          disconnected ||
          signal.aborted ||
          !Number.isSafeInteger(retryDeadline) ||
          Date.now() + delayMs + MIN_RETRY_WINDOW_MS >= retryDeadline
        )
          break;
        await waitForDraftRetry(delayMs, signal);
        if (disconnected || signal.aborted || Date.now() + MIN_RETRY_WINDOW_MS >= retryDeadline) break;
        response = await request('/draft', body, signal);
      }
      if (response.status === 401) {
        token = '';
        throw new CompanionRequestError('unauthorized');
      }
      if (await usageLimitResponse(response)) throw new CompanionRequestError('usageLimit');
      if (!response.ok) throw new CompanionRequestError('draftFailed');
      const result = await responseObject(response);
      const single = Object.keys(result).sort().join(',') === 'requestId,strategy' && !!result.strategy;
      const batch =
        Object.keys(result).sort().join(',') === 'requestId,strategies' &&
        Array.isArray(result.strategies) &&
        result.strategies.length >= 1 &&
        result.strategies.length <= 3;
      if (disconnected || signal.aborted || result.requestId !== context.requestId || (!single && !batch))
        throw new CompanionRequestError('draftFailed');
      return single
        ? { requestId: context.requestId, strategy: result.strategy }
        : { requestId: context.requestId, strategies: result.strategies };
    },
    async discoveryDraft(context, provider, signal) {
      if (!token || Date.now() >= expiresAt) {
        token = '';
        throw new CompanionRequestError('unauthorized');
      }
      const response = await request(
        '/discovery/draft',
        { version: 2, provider, expiresAt: Date.now() + 300_000, context },
        signal
      );
      if (response.status === 401) {
        token = '';
        throw new CompanionRequestError('unauthorized');
      }
      if (!response.ok) throw new CompanionRequestError('draftFailed');
      const result = await responseObject(response);
      if (disconnected || signal.aborted || result.requestId !== context.requestId || !result.strategy)
        throw new CompanionRequestError('draftFailed');
      return { requestId: context.requestId, strategy: result.strategy };
    },
    disconnect() {
      disconnected = true;
      token = '';
      expiresAt = 0;
    },
  };
}
