import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

vi.hoisted(() => vi.resetModules());
vi.mock('@polkadot/util-crypto', async (original) => await original());

const runtime = vi.hoisted(() => ({
  mount: vi.fn(),
  adapter: vi.fn(),
  request: vi.fn(),
  connect: vi.fn(),
  notify: vi.fn(),
}));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: { value: true },
    soraAddress: { value: 'group-wallet' },
    connectSoraWallet: runtime.connect,
  }),
}));
vi.mock('@/composables/useTransaction', () => ({ useTransaction: () => ({ withNotifications: runtime.notify }) }));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/store/walletAdapter', () => ({ createStoreWalletAdapter: runtime.adapter }));
vi.mock('@sora/sora-pay/widget', () => ({ DEFAULT_MESSAGES: { title: 'Title' }, mountSoraPay: runtime.mount }));
vi.mock('@/features/store/rehearsal/client', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  refundRequest: runtime.request,
}));

import { parseRefundHandoff } from '@/features/store/rehearsal/client';
import { useRefundRehearsal } from '@/features/store/rehearsal/useRefundRehearsal';
import { canonicalStoreAddress } from '@/features/store/client';
import { validatePaymentRequest } from '@sora/sora-pay/core';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

const fixture = () => ({
  version: 1,
  orderId: '01234567-89ab-4def-8123-0123456789ab',
  handoffSha256: 'f'.repeat(64),
  state: 'available',
  paymentRequest: {
    version: 1,
    merchant: { id: 'polkaswap-community-store', name: 'Polkaswap Community Store' },
    chainGenesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
    assetId: '0x0200000000000000000000000000000000000000000000000000000000000000',
    payer: 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ',
    recipient: encodeAddress(new Uint8Array(32).fill(1), 69),
    amountCodec: '1759225000000000000',
    decimals: 18,
    denomination: '100000000000000000000000000000000000000',
    reference: 'sp_' + 'a'.repeat(32),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  },
});
// Same checksum-valid synthetic payer used by the toolkit's existing chain fixtures.
function handoff() {
  return fixture();
}
const wrappers: ReturnType<typeof mount>[] = [];
function composable() {
  let value!: ReturnType<typeof useRefundRehearsal>;
  wrappers.push(
    mount(
      defineComponent({
        setup() {
          value = useRefundRehearsal();
          return () => h('div');
        },
      })
    )
  );
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  runtime.request.mockResolvedValue(handoff());
  runtime.adapter.mockReturnValue({ adapter: true });
  runtime.mount.mockReturnValue({ controller: { dispose: vi.fn() }, remove: vi.fn() });
  runtime.connect.mockResolvedValue(undefined);
  runtime.notify.mockImplementation(async (handler) => {
    await handler();
    return { submitted: false };
  });
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

describe('refund handoff validation', () => {
  it('uses only the exact same-origin endpoint with no operator or recovery authentication', async () => {
    const actual = await vi.importActual<typeof import('@/features/store/rehearsal/client')>(
      '@/features/store/rehearsal/client'
    );
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ attemptToken: 'a'.repeat(64) }) });
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('location', { origin: 'http://127.0.0.1:41829' });
    try {
      await actual.refundRequest('claim', { handoffSha256: 'f'.repeat(64), orderId: handoff().orderId });
      expect(fetcher).toHaveBeenCalledWith(
        '/__store-refund-rehearsal/v1/claim',
        expect.objectContaining({ method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error' })
      );
      expect(fetcher.mock.calls[0][1].headers).toEqual({
        'X-Sora-Pay-Rehearsal': '1',
        'Content-Type': 'application/json',
      });
      vi.stubGlobal('location', { origin: 'https://polkaswap.io' });
      await expect(actual.refundRequest('claim', {})).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('pins the store group payer, chain, exact request and strips no invalid secrets silently', () => {
    expect(decodeAddress(handoff().paymentRequest.recipient).length).toBe(32);
    expect(canonicalStoreAddress(handoff().paymentRequest.recipient)).toBe(handoff().paymentRequest.recipient);
    expect(() => validatePaymentRequest(handoff().paymentRequest)).not.toThrow();
    expect(parseRefundHandoff(handoff()).paymentRequest.amountCodec).toBe('1759225000000000000');
    for (const change of [
      { payer: handoff().paymentRequest.recipient },
      { recipient: handoff().paymentRequest.payer },
      { amountCodec: '1.5' },
      { denomination: '1' },
      { decimals: 12 },
      { reference: 'private@example.invalid' },
      { chainGenesisHash: '0x' + '1'.repeat(64) },
      { operatorToken: 'private' },
    ])
      expect(() =>
        parseRefundHandoff({ ...handoff(), paymentRequest: { ...handoff().paymentRequest, ...change } })
      ).toThrow();
    expect(() => parseRefundHandoff({ ...handoff(), recoveryToken: 'private' })).toThrow();
  });
});

describe('refund wallet handoff', () => {
  it('blocks connection, claim and unlock after the refund view is unmounted', async () => {
    const flow = composable();
    await flow.refresh();
    await flow.mountPayment(document.createElement('div'));
    const hooks = runtime.adapter.mock.calls[0][0];
    expect(hooks.connected()).toBe(true);
    wrappers.pop()?.unmount();
    expect(hooks.connected()).toBe(false);
    await expect(hooks.connect()).rejects.toThrow('refund_unavailable');
    await expect(hooks.beginAttempt()).rejects.toThrow('refund_unavailable');
    await expect(hooks.withNotifications(vi.fn())).rejects.toThrow('refund_unavailable');
    expect(runtime.connect).not.toHaveBeenCalled();
    expect(runtime.notify).not.toHaveBeenCalled();
    expect(runtime.request).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'keeps a delayed claim locked after disposal, even if cancellation fails: %s',
    async (fails) => {
      const flow = composable();
      await flow.refresh();
      await flow.mountPayment(document.createElement('div'));
      const hooks = runtime.adapter.mock.calls[0][0];
      let finish!: (value: unknown) => void;
      runtime.request.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      const pending = hooks.beginAttempt();
      wrappers.pop()?.unmount();
      if (fails) runtime.request.mockRejectedValueOnce(new Error('offline'));
      else runtime.request.mockResolvedValueOnce({ accepted: true });
      finish({ attemptToken: 'a'.repeat(64) });
      await expect(pending).rejects.toThrow('refund_unavailable');
      expect(runtime.request).toHaveBeenLastCalledWith('canceled', { attemptToken: 'a'.repeat(64) });
      expect(runtime.request).toHaveBeenCalledTimes(3);
      expect(hooks.connected()).toBe(false);
      await expect(flow.mountPayment(document.createElement('div'))).rejects.toThrow('refund_unavailable');
      expect(runtime.notify).not.toHaveBeenCalled();
    }
  );

  it('does not enter the signing callback when unlock finishes after disposal', async () => {
    const flow = composable();
    await flow.refresh();
    await flow.mountPayment(document.createElement('div'));
    const hooks = runtime.adapter.mock.calls[0][0];
    let unlocked!: () => Promise<void>;
    runtime.notify.mockImplementationOnce((handler) => {
      unlocked = handler;
      return Promise.resolve({ submitted: false });
    });
    const signer = vi.fn();
    await hooks.withNotifications(signer);
    wrappers.pop()?.unmount();
    await expect(unlocked()).rejects.toThrow('refund_unavailable');
    expect(signer).not.toHaveBeenCalled();
    expect(hooks.connected()).toBe(false);
  });

  it('claims durably through the local endpoint before invoking the shared adapter signing hooks', async () => {
    const flow = composable();
    await flow.refresh();
    const cleanup = await flow.mountPayment(document.createElement('div'));
    const options = runtime.mount.mock.calls[0][1];
    const hooks = runtime.adapter.mock.calls[0][0];
    expect(options.request).toEqual(flow.handoff.value?.paymentRequest);
    expect(options.adapter).toEqual({ adapter: true });
    runtime.request.mockResolvedValueOnce({ attemptToken: 'a'.repeat(64) });
    expect(await hooks.beginAttempt()).toBe('a'.repeat(64));
    expect(runtime.request).toHaveBeenLastCalledWith('claim', {
      handoffSha256: 'f'.repeat(64),
      orderId: handoff().orderId,
    });
    hooks.onPending();
    await flushPromises();
    expect(runtime.request).toHaveBeenCalledWith('uncertain', { attemptToken: 'a'.repeat(64) });
    cleanup();
    expect(runtime.mount.mock.results[0].value.controller.dispose).toHaveBeenCalledOnce();
  });

  it('reports only the local claim/hash and never establishes finality from the browser callback', async () => {
    const flow = composable();
    await flow.refresh();
    await flow.mountPayment(document.createElement('div'));
    const hooks = runtime.adapter.mock.calls[0][0];
    const options = runtime.mount.mock.calls[0][1];
    runtime.request
      .mockResolvedValueOnce({ accepted: true })
      .mockResolvedValueOnce({ ...handoff(), state: 'submitted', transactionHash: '0x' + 'b'.repeat(64) });
    await hooks.reportTransaction('0x' + 'b'.repeat(64), 'a'.repeat(64));
    expect(runtime.request).toHaveBeenCalledWith('submitted', {
      attemptToken: 'a'.repeat(64),
      transactionHash: '0x' + 'b'.repeat(64),
    });
    expect(flow.handoff.value?.state).toBe('submitted');
    runtime.request.mockResolvedValue({ ...handoff(), state: 'submitted', transactionHash: '0x' + 'b'.repeat(64) });
    expect(await options.reconcile()).toBeNull();
    await expect(flow.mountPayment(document.createElement('div'))).rejects.toThrow();
  });

  it('records proven cancellation, keeps it locked, and rejects corrupt claims', async () => {
    const flow = composable();
    await flow.refresh();
    await flow.mountPayment(document.createElement('div'));
    const hooks = runtime.adapter.mock.calls[0][0];
    runtime.request.mockResolvedValueOnce({ attemptToken: 'invalid' });
    await expect(hooks.beginAttempt()).rejects.toThrow();
    runtime.request
      .mockResolvedValueOnce({ accepted: true })
      .mockResolvedValueOnce({ ...handoff(), state: 'canceled' });
    await hooks.cancelAttempt('a'.repeat(64));
    expect(flow.handoff.value?.state).toBe('canceled');
    await expect(flow.mountPayment(document.createElement('div'))).rejects.toThrow();
  });

  it('does not mount claimed/uncertain handoffs or a failed response', async () => {
    for (const state of ['claimed', 'uncertain']) {
      runtime.request.mockResolvedValue({ ...handoff(), state });
      const flow = composable();
      await flow.refresh();
      await expect(flow.mountPayment(document.createElement('div'))).rejects.toThrow();
    }
    runtime.request.mockRejectedValue(new Error('offline'));
    const flow = composable();
    await flow.refresh();
    expect(flow.failed.value).toBe(true);
    expect(runtime.mount).not.toHaveBeenCalled();
  });

  it('clears a previously available request after a failed refresh', async () => {
    const flow = composable();
    await flow.refresh();
    expect(flow.handoff.value?.state).toBe('available');
    runtime.request.mockRejectedValue(new Error('offline'));
    await flow.refresh();
    expect(flow.handoff.value).toBeNull();
    await expect(flow.mountPayment(document.createElement('div'))).rejects.toThrow();
  });
});
