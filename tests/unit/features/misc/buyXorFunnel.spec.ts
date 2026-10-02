import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import {
  BUY_XOR_FUNNEL_CONSENT_KEY,
  BUY_XOR_FUNNEL_ENDPOINT,
  buyXorFunnelReason,
  buyXorPrivacyBlocked,
  parseBuyXorFunnelEvent,
  sendBuyXorFunnelEvent,
} from '@/features/misc/lib/buyXorFunnel';
import { useBuyXorFunnel } from '@/features/misc/composables/useBuyXorFunnel';

const event = { v: 1, step: 'quote_available', route: 'ethereum', reason: 'none' };
const options = { consent: true, privacyBlocked: false, origin: 'https://polkaswap.io' };
describe('anonymous Buy XOR counters', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('accepts only fixed enums and rejects identifiers, extra keys and invalid stage/reason combinations', () => {
    expect(parseBuyXorFunnelEvent(event)).toEqual(event);
    for (const value of [
      null,
      [],
      { ...event, amount: '10' },
      { ...event, wallet: '0xabc' },
      { ...event, hash: '0xabc' },
      { ...event, route: 'my-wallet' },
      { ...event, reason: 'fees' },
      { ...event, route: 'unset' },
      { ...event, v: 2 },
    ])
      expect(parseBuyXorFunnelEvent(value)).toBeNull();
    expect(parseBuyXorFunnelEvent({ ...event, step: 'quote_blocked', reason: 'fees' })).not.toBeNull();
  });
  it('reduces public reasons to coarse categories and never reflects arbitrary provider text', () => {
    expect(buyXorFunnelReason('fees-insufficient')).toBe('fees');
    expect(buyXorFunnelReason('price-impact')).toBe('liquidity');
    expect(buyXorFunnelReason('card-minimum')).toBe('amount');
    expect(buyXorFunnelReason('conversion-unavailable')).toBe('provider');
    expect(buyXorFunnelReason('mainnet')).toBe('network');
    expect(buyXorFunnelReason('account 0xabc failed')).toBe('other');
  });
  it.each([
    ['wallet', 'network'],
    ['budget', 'fees'],
    ['provider', 'provider'],
    ['gas', 'fees'],
    ['simulation', 'other'],
    ['bridge', 'network'],
    ['conversion', 'provider'],
    ['liquidity', 'liquidity'],
  ])('maps full card-review reason %s to %s without exposing its details', (reason, expected) => {
    expect(buyXorFunnelReason(reason)).toBe(expected);
  });
  it.each(['conversion_failed', 'bridge_failed', 'swap_failed'])('counts verified %s without provider text', (step) => {
    expect(parseBuyXorFunnelEvent({ ...event, step })).toEqual({ ...event, step });
    expect(parseBuyXorFunnelEvent({ ...event, step, reason: 'provider' })).toBeNull();
  });
  it.each([{ doNotTrack: '1' }, { doNotTrack: 'yes' }, { globalPrivacyControl: true }])(
    'honors browser signal %j',
    (browser) => {
      expect(buyXorPrivacyBlocked(browser, undefined)).toBe(true);
    }
  );
  it('honors the legacy window signal without requiring consent state', () => {
    expect(buyXorPrivacyBlocked({}, '1')).toBe(true);
    expect(buyXorPrivacyBlocked({ doNotTrack: '0', globalPrivacyControl: false }, undefined)).toBe(false);
  });
  it('uses a fixed endpoint without credentials, referrer, identifiers or analytics defaults', async () => {
    const fetcher = vi.fn().mockResolvedValue({ status: 204 });
    expect(await sendBuyXorFunnelEvent(event, { ...options, fetcher })).toBe('recorded');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      BUY_XOR_FUNNEL_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify(event),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        cache: 'no-store',
      })
    );
  });
  it.each([
    { consent: false },
    { privacyBlocked: true },
    { origin: 'http://localhost:8888' },
    { origin: 'https://test.polkaswap.io' },
  ])('never sends with disabled policy %j', async (override) => {
    const fetcher = vi.fn();
    expect(await sendBuyXorFunnelEvent(event, { ...options, ...override, fetcher })).toBe('disabled');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('never retries uncertain delivery or reports an HTTP error as collection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await sendBuyXorFunnelEvent(event, { ...options, fetcher })).toBe('unavailable');
    expect(fetcher).toHaveBeenCalledOnce();
    fetcher.mockResolvedValue({ status: 500 });
    expect(await sendBuyXorFunnelEvent(event, { ...options, fetcher })).toBe('unavailable');
  });
  it('starts opted out and records each tuple once per mounted page after explicit consent', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://polkaswap.io' },
      localStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const fetcher = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('fetch', fetcher);
    const route = ref('ethereum');
    const scope = effectScope();
    const funnel = scope.run(() => useBuyXorFunnel({ enabled: true, route }))!;
    expect(funnel.consent.value).toBe(false);
    await funnel.record('view');
    expect(fetcher).not.toHaveBeenCalled();
    funnel.setConsent(true);
    expect(localStorage.getItem(BUY_XOR_FUNNEL_CONSENT_KEY)).toBe('yes');
    await funnel.record('view');
    await funnel.record('view');
    expect(fetcher).toHaveBeenCalledOnce();
    route.value = 'card';
    await funnel.record('view');
    expect(fetcher).toHaveBeenCalledTimes(2);
    funnel.setConsent(false);
    await funnel.record('quote_requested');
    expect(fetcher).toHaveBeenCalledTimes(2);
    scope.stop();
  });
  it('does not send campaign observations and rechecks GPC after an earlier opt-in', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://polkaswap.io' },
      localStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const fetcher = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('fetch', fetcher);
    const enabled = ref(false);
    const scope = effectScope();
    const funnel = scope.run(() => useBuyXorFunnel({ enabled, route: 'ethereum' }))!;
    funnel.setConsent(true);
    await funnel.record('view');
    enabled.value = true;
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    await funnel.record('view');
    expect(fetcher).not.toHaveBeenCalled();
    scope.stop();
  });
  it('honors an opt-out from another tab and removes its observer on disposal', async () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal('window', {
      location: { origin: 'https://polkaswap.io' },
      localStorage,
      addEventListener: add,
      removeEventListener: remove,
    });
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const scope = effectScope();
    const funnel = scope.run(() => useBuyXorFunnel({ enabled: true, route: 'ethereum' }))!;
    funnel.setConsent(true);
    add.mock.calls[0][1]({ key: BUY_XOR_FUNNEL_CONSENT_KEY, newValue: 'no' });
    await funnel.record('view');
    expect(funnel.consent.value).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    scope.stop();
    expect(remove).toHaveBeenCalledWith('storage', add.mock.calls[0][1]);
  });
});
