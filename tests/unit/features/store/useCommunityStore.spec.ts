import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { encodeAddress } from '@polkadot/util-crypto';

vi.mock('@polkadot/util-crypto', async (original) => await original());
const runtime = vi.hoisted(() => ({
  connected: true,
  address: '',
  connect: vi.fn(),
  notifications: vi.fn(),
  mount: vi.fn(),
}));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: {
      get value() {
        return runtime.connected;
      },
    },
    soraAddress: {
      get value() {
        return runtime.address;
      },
    },
    connectSoraWallet: runtime.connect,
  }),
}));
vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({ withNotifications: runtime.notifications }),
}));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/store/walletAdapter', () => ({ createStoreWalletAdapter: () => ({}) }));
vi.mock('@sora/sora-pay/widget', () => ({ DEFAULT_MESSAGES: {}, mountSoraPay: runtime.mount }));
import { useCommunityStore } from '@/features/store/useCommunityStore';
import { STORE_MAINNET_GENESIS } from '@/features/store/client';

const recipient = encodeAddress(new Uint8Array(32).fill(3), 69);
const payer = encodeAddress(new Uint8Array(32).fill(2), 69);
const publicConfig = { version: 1, relayUrl: 'https://relay.example', merchantId: 'polkaswap-community', recipient };
const catalog = {
  enabled: true,
  version: 'v1',
  merchant: {
    id: 'polkaswap-community',
    name: 'Store',
    operatorName: 'Volunteers',
    supportEmail: 'support@example.test',
    dispatchPolicy: 'On demand',
    customsPolicy: 'Review before dispatch',
    privacyPolicy: 'Private',
    cancellationPolicy: 'Full XOR refund',
  },
  pricing: {
    kind: 'exact-xor',
    version: 'v1',
  },
  product: {
    id: 'sencha',
    name: 'Sencha',
    grams: 100,
    priceXor: '1.759225',
    packedGrams: 120,
    packagingGrams: 80,
    stockAvailable: null,
    fulfillmentMode: 'on-demand',
  },
  shipping: [{ id: 'ems500', countries: ['TW'], maxGrams: 500, priceXor: '1', label: 'EMS' }],
  chain: {
    genesisHash: STORE_MAINNET_GENESIS,
    assetId: '0x0200000000000000000000000000000000000000000000000000000000000000',
    decimals: 18,
    denomination: '1000000',
    recipient,
  },
};
const input = {
  quantity: 1,
  shipping: {
    name: 'Private Customer',
    country: 'TW',
    address1: 'Private Street',
    address2: '',
    city: 'Taipei',
    region: '',
    postalCode: '100',
  },
  contact: { kind: 'email' as const, value: 'customer@example.test' },
};
const storageKey = 'polkaswap:community-store:recovery:v1';
/** Frozen private-order fixture returned by the trusted relay. */
function savedOrder() {
  return {
    orderId: 'order_12345678',
    recoveryToken: 'a'.repeat(64),
    status: 'awaiting_payment',
    notificationStatus: 'pending',
    paymentRequest: {
      version: 1,
      merchant: { id: publicConfig.merchantId, name: 'Store' },
      chainGenesisHash: STORE_MAINNET_GENESIS,
      assetId: catalog.chain.assetId,
      decimals: 18,
      denomination: '1000000',
      payer,
      recipient,
      amountCodec: '2759225000000000000',
      reference: `sp_${'b'.repeat(32)}`,
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
    },
  };
}
/** Mount a real owner scope so polling is cleaned up exactly as it is during navigation. */
function host() {
  let state!: ReturnType<typeof useCommunityStore>;
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useCommunityStore();
        return () => h('div');
      },
    })
  );
  return { state, wrapper };
}
/** Mock network boundaries, preserving the real parsers and POST body construction. */
function transport(orderResponse: () => unknown = savedOrder) {
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith('community-store.json')) return new Response(JSON.stringify(publicConfig));
    if (url.endsWith('/catalog')) return new Response(JSON.stringify(catalog));
    return new Response(JSON.stringify(orderResponse()));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  sessionStorage.clear();
  runtime.connected = true;
  runtime.address = payer;
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('private store checkout lifecycle', () => {
  it('saves a durable order before payment and persists no shipping or contact data in recovery storage', async () => {
    const fetch = transport();
    const { state, wrapper } = host();
    await state.refreshCatalog();
    expect(state.isAvailable.value).toBe(true);
    await expect(state.createPayment(document.createElement('div'))).rejects.toThrow();
    await state.createOrder(input);
    expect(state.order.value?.status).toBe('awaiting_payment');
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/orders'))!;
    const body = JSON.parse(String(call[1].body));
    expect(body.address).not.toHaveProperty('line2');
    expect(body.address).not.toHaveProperty('region');
    expect(body.address.name).toBe(input.shipping.name);
    const stored = sessionStorage.getItem(storageKey)!;
    expect(stored).toContain('recoveryToken');
    for (const privateText of ['Private Customer', 'Private Street', 'customer@example.test'])
      expect(stored).not.toContain(privateText);
    expect(runtime.notifications).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('restores an order after the create response was lost without reposting private details', async () => {
    let fail = true;
    const fetch = transport(() => {
      if (fail) throw new Error('offline');
      return savedOrder();
    });
    const first = host();
    await first.state.refreshCatalog();
    await first.state.createOrder(input);
    expect(first.state.order.value).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toContain('creationKey');
    first.wrapper.unmount();
    fail = false;
    const next = host();
    await next.state.refreshCatalog();
    expect(next.state.order.value?.orderId).toBe('order_12345678');
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/orders'))).toHaveLength(1);
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/recover-create'))).toBe(true);
    next.wrapper.unmount();
  });
  it('preserves pending payments during recovery and rejects attempts to reset or pay again', async () => {
    transport(() => ({ ...savedOrder(), paymentPending: true }));
    const { state, wrapper } = host();
    await state.refreshCatalog();
    await state.recoverOrder('order_12345678', 'a'.repeat(64));
    expect(state.order.value?.status).toBe('payment_pending');
    state.resetOrder();
    expect(state.order.value).not.toBeNull();
    await expect(state.createPayment(document.createElement('div'))).rejects.toThrow();
    wrapper.unmount();
  });
  it('keeps browsing but disables new orders during relay outages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('community-store.json')) return new Response(JSON.stringify(publicConfig));
        throw new Error('offline');
      })
    );
    const { state, wrapper } = host();
    await state.refreshCatalog();
    await state.createOrder(input);
    expect(state.isAvailable.value).toBe(false);
    expect(state.order.value).toBeNull();
    expect(runtime.notifications).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('retains uncertain expired payments but allows a genuinely terminal order to be replaced', async () => {
    let response = { ...savedOrder(), status: 'expired', paymentPending: true };
    transport(() => response);
    const { state, wrapper } = host();
    await state.refreshCatalog();
    await state.recoverOrder('order_12345678', 'a'.repeat(64));
    state.resetOrder();
    expect(state.order.value).not.toBeNull();
    expect(sessionStorage.getItem(storageKey)).toContain('recoveryToken');
    response = { ...response, paymentPending: false };
    await state.refreshOrder();
    state.resetOrder();
    expect(state.order.value).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
    wrapper.unmount();
  });
  it('refuses changed payment instructions returned by a status refresh', async () => {
    const original = savedOrder();
    let response = original;
    transport(() => response);
    const { state, wrapper } = host();
    await state.refreshCatalog();
    await state.createOrder(input);
    response = { ...original, paymentRequest: { ...original.paymentRequest, amountCodec: '1' } };
    await state.refreshOrder();
    expect(state.order.value?.paymentRequest.amountCodec).toBe(original.paymentRequest.amountCodec);
    expect(state.error.value).toBe('communityStore.statusUnavailable');
    wrapper.unmount();
  });
});
