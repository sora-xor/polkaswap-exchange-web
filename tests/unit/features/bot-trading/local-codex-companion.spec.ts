import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanionRequestError, createLocalCodexCompanion } from '@/features/bot-trading/local-codex-companion';
import type { DesktopAiContext } from '@/features/bot-trading/desktop-ai';

const code = 'a'.repeat(32);
const token = 'b'.repeat(64);
const context = {
  requestId: 'request-one',
  purpose: 'autopilot-training',
  candles: [{ timestamp: 1, close: '0.12345678901234567890123456789012345' }],
} as unknown as DesktopAiContext;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('local Codex companion transport', () => {
  it('requires a full pairing code before any loopback request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await expect(client.pair('12345678', new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('unauthorized')
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the bearer out of URLs and request bodies and sends only public training context', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requestId: context.requestId, strategy: { kind: 'dca' } })));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    const result = await client.draft(context, new AbortController().signal);
    expect(result).toEqual({ requestId: context.requestId, strategy: { kind: 'dca' } });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:39847/pair',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({ code }),
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:39847/draft',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ context }),
      })
    );
    expect(JSON.stringify(fetch.mock.calls.map((call) => [call[0], call[1].body]))).not.toContain(token);
    client.disconnect();
    await expect(client.draft(context, new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('unauthorized')
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('forwards a bounded local batch for the page to validate before research', async () => {
    const strategies = [{ kind: 'dca' }, { kind: 'rules' }];
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requestId: context.requestId, strategies })));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    await expect(client.draft(context, new AbortController().signal)).resolves.toEqual({
      requestId: context.requestId,
      strategies,
    });
  });

  it('retries one fixed model failure with the exact same training context', async () => {
    vi.useFakeTimers();
    const liveContext = { ...context, expiresAt: Date.now() + 60_000 };
    const result = { requestId: liveContext.requestId, strategies: [{ kind: 'rules' }] };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'draft_failed' }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(result)));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    const draft = client.draft(liveContext, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(draft).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[2][1].body);
    expect(fetch.mock.calls[1][1].headers).toEqual(fetch.mock.calls[2][1].headers);
  });

  it('recovers when the third attempt answers the same still-pending draft', async () => {
    vi.useFakeTimers();
    const liveContext = { ...context, expiresAt: Date.now() + 90_000 };
    const result = { requestId: liveContext.requestId, strategies: [{ kind: 'rules' }] };
    const failure = () => new Response(JSON.stringify({ error: 'draft_failed' }), { status: 502 });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 90_000 })))
      .mockResolvedValueOnce(failure())
      .mockResolvedValueOnce(failure())
      .mockResolvedValueOnce(new Response(JSON.stringify(result)));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    const draft = client.draft(liveContext, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(3_000);
    await expect(draft).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[2][1].body);
    expect(fetch.mock.calls[2][1].body).toBe(fetch.mock.calls[3][1].body);
  });

  it('caps automatic model retries at two and leaves other failures for manual recovery', async () => {
    vi.useFakeTimers();
    const liveContext = { ...context, expiresAt: Date.now() + 60_000 };
    const failure = () => new Response(JSON.stringify({ error: 'draft_failed' }), { status: 502 });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(failure())
      .mockResolvedValueOnce(failure())
      .mockResolvedValueOnce(failure());
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    const draft = client.draft(liveContext, new AbortController().signal);
    const failed = expect(draft).rejects.toEqual(new CompanionRequestError('draftFailed'));
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(3_000);
    await failed;
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not retry unavailable, busy, timed-out, or malformed companion responses', async () => {
    const liveContext = { ...context, expiresAt: Date.now() + 60_000 };
    for (const first of [
      new Response(JSON.stringify({ error: 'codex_unavailable' }), { status: 502 }),
      new Response(JSON.stringify({ error: 'busy' }), { status: 409 }),
      new Response(JSON.stringify({ error: 'draft_timeout' }), { status: 504 }),
      new Response('not-json', { status: 502 }),
    ]) {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
        .mockResolvedValueOnce(first);
      vi.stubGlobal('fetch', fetch);
      const client = createLocalCodexCompanion();
      await client.pair(code, new AbortController().signal);
      await expect(client.draft(liveContext, new AbortController().signal)).rejects.toEqual(
        new CompanionRequestError('draftFailed')
      );
      expect(fetch).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    }
  });

  it('reports a fixed usage limit without retrying or accepting extra response fields', async () => {
    for (const [reply, reason] of [
      [new Response(JSON.stringify({ error: 'usage_limit' }), { status: 429 }), 'usageLimit'],
      [new Response(JSON.stringify({ error: 'usage_limit', detail: 'private' }), { status: 429 }), 'draftFailed'],
    ] as const) {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
        .mockResolvedValueOnce(reply);
      vi.stubGlobal('fetch', fetch);
      const client = createLocalCodexCompanion();
      await client.pair(code, new AbortController().signal);
      await expect(
        client.draft({ ...context, expiresAt: Date.now() + 60_000 }, new AbortController().signal)
      ).rejects.toEqual(new CompanionRequestError(reason));
      expect(fetch).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    }
  });

  it('cancels an automatic retry during backoff without sending another request', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'draft_failed' }), { status: 502 }));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, controller.signal);
    const draft = client.draft({ ...context, expiresAt: Date.now() + 60_000 }, controller.signal);
    const cancelled = expect(draft).rejects.toEqual(new CompanionRequestError('unavailable'));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    controller.abort();
    await cancelled;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('checks the draft deadline again after backoff before retrying', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const expiresAt = Date.now() + 35_000;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'draft_failed' }), { status: 502 }));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, controller.signal);
    const draft = client.draft({ ...context, expiresAt }, controller.signal);
    const failed = expect(draft).rejects.toEqual(new CompanionRequestError('draftFailed'));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    vi.setSystemTime(Date.now() + 6_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await failed;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the context has no safe expiry window', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'draft_failed' }), { status: 502 }));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    await expect(client.draft(context, new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('draftFailed')
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects a mismatched draft without forwarding it to the page', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requestId: 'another-request', strategy: { kind: 'dca' } })));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    await expect(client.draft(context, new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('draftFailed')
    );
  });

  it('stops reading an oversized local response before parsing it', async () => {
    const cancelled = vi.fn();
    const oversized = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(32_769));
        },
        cancel: cancelled,
      })
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(oversized));
    const client = createLocalCodexCompanion();
    await expect(client.pair(code, new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('unavailable')
    );
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('drops an unauthorized bearer instead of retrying with the old pairing code', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token, expiresAt: Date.now() + 60_000 })))
      .mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    const client = createLocalCodexCompanion();
    await client.pair(code, new AbortController().signal);
    await expect(client.draft(context, new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('unauthorized')
    );
    await expect(client.draft(context, new AbortController().signal)).rejects.toEqual(
      new CompanionRequestError('unauthorized')
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
