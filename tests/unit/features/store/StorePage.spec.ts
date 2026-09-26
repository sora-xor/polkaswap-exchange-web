import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import SoraPayCheckout from '@/features/store/components/SoraPayCheckout.vue';
import StoreProductGallery from '@/features/store/components/StoreProductGallery.vue';
import messages from '@/features/store/messages.en.json';
import StorePage from '@/features/store/pages/StorePage.vue';
import type { CommunityStoreCatalog, CommunityStoreOrder } from '@/features/store/types';

const shared = vi.hoisted(() => ({ context: null as ReturnType<typeof createContext> | null }));

const exampleCatalog: CommunityStoreCatalog = {
  version: 'launch-1',
  enabled: true,
  merchant: {
    id: 'tea',
    name: 'Community Store',
    operatorName: 'Community Volunteers',
    supportTelegram: 'sora_xor',
    dispatchPolicy: 'Dispatch after sourcing.',
    customsPolicy: 'Import requirements apply.',
    privacyPolicy: 'Private fulfillment only.',
    cancellationPolicy: 'Refund if unfulfillable.',
  },
  pricing: { kind: 'exact-xor', version: 'fixed-xor-1' },
  product: {
    id: 'sencha-100',
    name: 'Organic sencha',
    grams: 100,
    priceXor: '1.759225',
    stockAvailable: null,
    packedGrams: 120,
    packagingGrams: 80,
  },
  shipping: [{ id: 'jp-small', countries: ['JP'], maxGrams: 500, priceXor: '0.620733', label: 'Tracked parcel' }],
  chain: {
    genesisHash: `0x${'a'.repeat(64)}`,
    assetId: `0x02${'0'.repeat(62)}`,
    decimals: 18,
    denomination: '1',
    recipient: 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ',
  },
};

const exampleOrder: CommunityStoreOrder = {
  orderId: 'order-public-123',
  recoveryToken: 'private-recovery-token',
  status: 'awaiting_payment',
  notificationStatus: 'pending',
  paymentRequest: {
    version: 1,
    merchant: { id: 'tea', name: 'Community Store' },
    chainGenesisHash: `0x${'a'.repeat(64)}`,
    assetId: `0x02${'0'.repeat(62)}`,
    recipient: exampleCatalog.chain.recipient,
    payer: 'payer-address',
    amountCodec: '2379958000000000000',
    decimals: 18,
    denomination: '1',
    reference: 'public-random-reference',
    expiresAt: '2026-09-25T12:30:00Z',
  },
};

function createContext() {
  return {
    catalog: ref<CommunityStoreCatalog | null>(null),
    loading: ref(false),
    busy: ref(false),
    error: ref(''),
    isAvailable: ref(false),
    order: ref<CommunityStoreOrder | null>(null),
    status: ref('awaiting_payment'),
    isConnected: ref(false),
    walletAddress: ref('payer-address'),
    connectWallet: vi.fn(),
    refreshCatalog: vi.fn(async () => {}),
    createOrder: vi.fn(async (_input: unknown) => {}),
    getQuote: vi.fn((_quantity: number, country: string) =>
      country === 'JP'
        ? {
            unitXor: '1.759225',
            shippingXor: '0.620733',
            totalXor: '2.379958',
            shippingLabel: 'Tracked parcel',
            shippingRateId: 'jp-small',
          }
        : null
    ),
    refreshOrder: vi.fn(async () => {}),
    recoverOrder: vi.fn(async (_id: string, _token: string) => {}),
    createPayment: vi.fn(async (_element: HTMLElement) => () => {}),
    resetOrder: vi.fn(),
  };
}

vi.mock('@/features/store/useCommunityStore', () => ({ useCommunityStore: () => shared.context! }));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    language: ref('en'),
    t: (key: string, params?: Record<string, unknown>) => {
      const message = (messages as Record<string, unknown>)[key.replace('communityStore.', '')];
      let value = typeof message === 'string' ? message : key;
      for (const [name, replacement] of Object.entries(params || {}))
        value = value.replace(`{${name}}`, String(replacement));
      return value;
    },
  }),
}));

const wrappers: Array<{ unmount(): void }> = [];
function render() {
  const wrapper = mount(StorePage);
  wrappers.push(wrapper);
  return wrapper;
}
function openStore() {
  shared.context!.catalog.value = structuredClone(exampleCatalog);
  shared.context!.isAvailable.value = true;
}

beforeEach(() => {
  shared.context = createContext();
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

describe('community Store page', () => {
  it('offers repeat ordering only after a safe terminal state and shows delivered notifications', async () => {
    openStore();
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:receipt');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    shared.context!.resetOrder.mockImplementation(() => {
      shared.context!.order.value = null;
    });
    shared.context!.order.value = { ...exampleOrder, status: 'expired', paymentPending: true };
    shared.context!.status.value = 'expired';
    const wrapper = render();
    expect(wrapper.find('[data-testid="store-new-order"]').exists()).toBe(false);
    shared.context!.order.value = { ...exampleOrder, status: 'shipped', notificationStatus: 'delivered' };
    shared.context!.status.value = 'shipped';
    await flushPromises();
    expect(wrapper.find('[data-testid="store-new-order"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Fulfillment volunteers have been notified.');
    await wrapper.get('[data-testid="store-new-order"]').trigger('click');
    await flushPromises();
    expect(createUrl).toHaveBeenCalledOnce();
    expect(shared.context!.resetOrder).toHaveBeenCalledOnce();
    expect(wrapper.find('#store-name').exists()).toBe(true);
  });
  it('keeps photography, policy, and support browsable with checkout disabled before relay availability', async () => {
    const wrapper = render();
    await flushPromises();
    expect(shared.context!.refreshCatalog).toHaveBeenCalledOnce();
    expect(wrapper.find('h1').text()).toContain('Organic sencha');
    expect(wrapper.find('img').attributes('src')).toContain('sencha-showcase.png');
    expect(wrapper.get('[data-testid="store-checkout"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.store-price__amount').text()).toBe('1.759225 XOR');
    expect(wrapper.text()).not.toMatch(/US\$|\bUSD\b|\bJPY\b|¥|5\.37|MUFG/);
    expect(wrapper.find('.store-pricing-policy').exists()).toBe(false);
    expect(wrapper.text()).toContain('Operated by Community Volunteers.');
    expect(wrapper.text()).toContain('For support, write in @sora_xor on Telegram.');
    expect(wrapper.find('a[href="https://t.me/sora_xor"]').exists()).toBe(true);
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/takemiya@sora\.org|@mtakemiya|Makoto Takemiya/i);
    expect(shared.context!.createPayment).not.toHaveBeenCalled();
  });

  it('shows one refund terms paragraph, replacing the fallback when the merchant policy is available', async () => {
    const wrapper = render();
    const refundTerms = wrapper.get('#store-terms > div:nth-child(2)');
    expect(refundTerms.findAll('p')).toHaveLength(1);
    expect(refundTerms.get('p').text()).toBe(messages.refundBody);

    openStore();
    await flushPromises();
    expect(refundTerms.findAll('p')).toHaveLength(1);
    expect(refundTerms.get('p').text()).toBe(exampleCatalog.merchant.cancellationPolicy);
    expect(refundTerms.text()).not.toContain(messages.refundBody);

    shared.context!.catalog.value = null;
    await flushPromises();
    expect(refundTerms.findAll('p')).toHaveLength(1);
    expect(refundTerms.get('p').text()).toBe(messages.refundBody);
  });

  it('keeps public support in the community Telegram group even with older relay contacts and a saved receipt', () => {
    openStore();
    shared.context!.catalog.value!.merchant.supportEmail = 'takemiya@sora.org';
    shared.context!.catalog.value!.merchant.supportTelegram = 'mtakemiya';
    shared.context!.order.value = structuredClone(exampleOrder);
    const wrapper = render();
    expect(wrapper.findAll('a[href="https://t.me/sora_xor"]')).toHaveLength(2);
    expect(wrapper.get('[data-testid="store-receipt"]').text()).toContain('@sora_xor');
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false);
    expect(wrapper.find('a[href="https://t.me/mtakemiya"]').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/takemiya@sora\.org|@mtakemiya|Makoto Takemiya/i);
  });

  it('shows only the catalog’s fixed XOR product price without internal fiat conversion details', () => {
    openStore();
    const wrapper = render();
    expect(wrapper.get('.store-price__amount').text()).toBe('1.759225 XOR');
    expect(wrapper.text()).not.toMatch(/US\$|\bUSD\b|\bJPY\b|¥|5\.37|MUFG|Price version/);
    expect(wrapper.find('.store-pricing-policy').exists()).toBe(false);
  });

  it('discloses public transfer details and keeps completed refunds distinct from pending refunds', async () => {
    openStore();
    shared.context!.order.value = structuredClone(exampleOrder);
    const wrapper = render();
    expect(wrapper.text()).toContain(
      'The transfer amount, wallet addresses and payment reference are public on-chain.'
    );
    expect(wrapper.text()).toContain('Your delivery and contact details stay private.');
    shared.context!.status.value = 'review';
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toContain('whether the tea can be sourced and shipped');
    expect(wrapper.get('.store-receipt__intro').text()).not.toContain('available stock');
    shared.context!.status.value = 'refund_pending';
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toContain('while your refund is pending');
    shared.context!.status.value = 'refunded';
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toContain('Your refund is complete.');
    expect(wrapper.get('.store-receipt__intro').text()).not.toContain('pending');
  });

  it('keeps saved legacy refund terms despite a newer catalog and uses the saved new policy for new orders', async () => {
    openStore();
    shared.context!.catalog.value!.refundPolicy = { version: 2, mode: 'net-network-fee' };
    shared.context!.order.value = structuredClone(exampleOrder);
    const wrapper = render();
    expect(wrapper.get('[data-testid="store-order-refund-policy"]').text()).toBe(messages.legacyRefundBody);
    shared.context!.status.value = 'refund_pending';
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toBe(messages.legacyRefundBody);
    shared.context!.status.value = 'refunded';
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toBe(messages.legacyRefundedBody);
    shared.context!.order.value.refundPolicy = { version: 2, mode: 'net-network-fee' };
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toBe(messages.refundedBody);
    expect(wrapper.get('.store-receipt__intro').text()).toContain(
      'Network fees paid with the original order were not refunded.'
    );
    shared.context!.status.value = 'refund_pending';
    await flushPromises();
    expect(wrapper.get('.store-receipt__intro').text()).toBe(messages.refundBody);
  });

  it('shows exact draft, quoted, finalized and fee-exempt correction amounts without claiming a draft amount', async () => {
    shared.context!.order.value = {
      ...structuredClone(exampleOrder),
      refundPolicy: { version: 2, mode: 'net-network-fee' },
      refund: { grossAmountCodec: '2000000000000000000', feeExempt: false },
    };
    shared.context!.status.value = 'refund_pending';
    const wrapper = render();
    const breakdown = () => wrapper.get('[data-testid="store-refund-breakdown"]');
    expect(
      breakdown()
        .findAll('dd')
        .map((row) => row.text())
    ).toEqual(['2 XOR']);
    shared.context!.order.value.refund = {
      grossAmountCodec: '2000000000000000000',
      amountCodec: '1900000000000000000',
      feeExempt: false,
      feeQuote: {
        amountCodec: '1900000000000000000',
        feeCodec: '100000000000000000',
        blockHash: `0x${'a'.repeat(64)}`,
        blockNumber: '1',
        expiresAt: '2026-09-26T00:00:00Z',
      },
    };
    await flushPromises();
    expect(breakdown().text()).toContain(messages.refundEstimatedFee);
    expect(breakdown().text()).not.toContain(messages.refundNet);
    expect(
      breakdown()
        .findAll('dd')
        .map((row) => row.text())
    ).toEqual(['2 XOR', '0.1 XOR', '1.9 XOR']);
    shared.context!.order.value.refund.transactionHash = `0x${'b'.repeat(64)}`;
    shared.context!.order.value.refund.deductedFeeCodec = '80000000000000000';
    shared.context!.order.value.refund.feeCorrectionCodec = '20000000000000000';
    shared.context!.order.value.refundFeeCorrectionCodec = '20000000000000000';
    await flushPromises();
    expect(breakdown().text()).toContain(messages.refundFee);
    expect(breakdown().text()).toContain(messages.refundNet);
    expect(
      breakdown()
        .findAll('dd')
        .map((row) => row.text())
    ).toEqual(['2 XOR', '0.08 XOR', '1.9 XOR', '0.02 XOR']);
    shared.context!.order.value.refund = {
      grossAmountCodec: '20000000000000000',
      amountCodec: '20000000000000000',
      feeExempt: true,
    };
    shared.context!.order.value.refundFeeCorrectionCodec = '0';
    await flushPromises();
    expect(
      breakdown()
        .findAll('dd')
        .map((row) => row.text())
    ).toEqual(['0.02 XOR', '0 XOR', '0.02 XOR']);
    expect(breakdown().text()).not.toContain(messages.refundRemainder);
  });

  it('supports source-on-demand quantities and caps only the configured parcel weight', async () => {
    openStore();
    const wrapper = render();
    const increase = wrapper.get('button[aria-label="Add one bag"]');
    await increase.trigger('click');
    await increase.trigger('click');
    expect(wrapper.get('output').text()).toBe('3');
    expect(increase.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).not.toContain('bags available');
    await wrapper.get('[data-testid="store-checkout"]').trigger('click');
    expect(wrapper.get('#store-contact').attributes('type')).toBe('email');
    expect(wrapper.text()).toContain('Email address');
    expect(wrapper.find('#store-name').exists()).toBe(true);
    expect(wrapper.text()).toContain('Connect your SORA wallet');
    expect(shared.context!.createPayment).not.toHaveBeenCalled();
  });

  it('persists validated private details before mounting payment and clears address fields afterwards', async () => {
    openStore();
    shared.context!.isConnected.value = true;
    shared.context!.createOrder.mockImplementation(async () => {
      shared.context!.order.value = structuredClone(exampleOrder);
    });
    const wrapper = render();
    await wrapper.get('[data-testid="store-checkout"]').trigger('click');
    await wrapper.get('#store-country').setValue('JP');
    await wrapper.get('#store-name').setValue('Customer Example');
    await wrapper.get('#store-address1').setValue('Private street 123');
    await wrapper.get('#store-city').setValue('Tokyo');
    await wrapper.get('#store-postal').setValue('100-0001');
    await wrapper.get('#store-contact').setValue('customer@example.org');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(shared.context!.createPayment).not.toHaveBeenCalled();
    await wrapper.get('.store-checkout__grid').trigger('submit');
    await flushPromises();
    expect(shared.context!.createOrder).toHaveBeenCalledWith({
      quantity: 1,
      shipping: {
        name: 'Customer Example',
        country: 'JP',
        address1: 'Private street 123',
        address2: '',
        city: 'Tokyo',
        region: '',
        postalCode: '100-0001',
      },
      contact: { kind: 'email', value: 'customer@example.org' },
    });
    expect(wrapper.find('[data-testid="store-receipt"]').exists()).toBe(true);
    expect(shared.context!.createPayment).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('2.379958 XOR');
    expect(wrapper.text()).not.toContain('Private street 123');
    expect(window.location.href).not.toContain('private-recovery-token');
  });

  it('does not submit without valid delivery fields, agreement, and a supported quote', async () => {
    openStore();
    shared.context!.isConnected.value = true;
    const wrapper = render();
    await wrapper.get('[data-testid="store-checkout"]').trigger('click');
    await wrapper.get('.store-checkout__grid').trigger('submit');
    expect(shared.context!.createOrder).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Check your delivery and contact details');
    expect(wrapper.get('[data-testid="store-save-order"]').attributes('disabled')).toBeDefined();
  });

  it('shows no payment widget or premature notification while a submitted transfer is being confirmed', async () => {
    shared.context!.order.value = { ...structuredClone(exampleOrder), status: 'payment_pending' };
    shared.context!.status.value = 'payment_pending';
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain('Confirming payment on SORA');
    expect(wrapper.text()).toContain('Do not send another payment');
    expect(wrapper.text()).not.toContain('Your volunteer notification is queued');
    expect(shared.context!.createPayment).not.toHaveBeenCalled();
  });

  it('shows payment acceptance separately from retrying volunteer notification', () => {
    shared.context!.order.value = { ...structuredClone(exampleOrder), status: 'paid' };
    shared.context!.status.value = 'paid';
    const wrapper = render();
    expect(wrapper.text()).toContain('Payment received');
    expect(wrapper.text()).toContain('Your volunteer notification is queued');
    expect(shared.context!.createPayment).not.toHaveBeenCalled();
  });

  it('recovers an order through the relay with a private code, never URL navigation', async () => {
    shared.context!.recoverOrder.mockImplementation(async () => {
      shared.context!.order.value = { ...structuredClone(exampleOrder), status: 'shipped' };
      shared.context!.status.value = 'shipped';
    });
    const wrapper = render();
    await wrapper.get('#store-recover-id').setValue('order-public-123');
    await wrapper.get('#store-recover-token').setValue('private-recovery-token');
    await wrapper.get('.store-recover__form').trigger('submit');
    await flushPromises();
    expect(shared.context!.recoverOrder).toHaveBeenCalledWith('order-public-123', 'private-recovery-token');
    expect((wrapper.get('#store-recover-token').element as HTMLInputElement).value).toBe('');
    expect(window.location.href).not.toContain('private-recovery-token');
    expect(wrapper.text()).toContain('Your tea is on its way');
    expect(wrapper.get('[data-testid="store-receipt"]').text()).toContain('@sora_xor');
  });
});

describe('store product photographs', () => {
  it('switches from the showcase to original label evidence with accurate alternative text', async () => {
    const wrapper = mount(StoreProductGallery);
    wrappers.push(wrapper);
    await wrapper.findAll('button')[2].trigger('click');
    expect(wrapper.get('img').attributes('src')).toContain('sencha-back.jpg');
    expect(wrapper.get('img').attributes('alt')).toContain('ingredient and brewing label');
    expect(wrapper.findAll('button')[2].attributes('aria-pressed')).toBe('true');
  });
});

describe('Sora Pay UI boundary', () => {
  it('cleans up a late widget initialization after navigation', async () => {
    let finish!: (cleanup: () => void) => void;
    const cleanup = vi.fn();
    const pending = new Promise<() => void>((resolve) => {
      finish = resolve;
    });
    const wrapper = mount(SoraPayCheckout, { props: { mountPayment: () => pending } });
    wrapper.unmount();
    finish(cleanup);
    await flushPromises();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('contains setup errors without exposing raw wallet or private data', async () => {
    const wrapper = mount(SoraPayCheckout, {
      props: {
        mountPayment: async () => {
          throw new Error('private delivery data');
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('Payment is temporarily unavailable');
    expect(wrapper.text()).not.toContain('private delivery data');
  });
});
