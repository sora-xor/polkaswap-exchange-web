import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FPNumber } from '@sora-substrate/sdk';
import BuyXorQuickStart from '@/features/misc/components/buy-xor/BuyXorQuickStart.vue';

const mocked = vi.hoisted(() => ({ request: vi.fn(), maxDai: vi.fn() }));
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    nodeIsConnected: true,
    networkFees: { Swap: '100020712589707326' },
    slippageTolerance: '1',
    moonpayApiKey: '',
  }),
}));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}));
vi.mock('@/features/misc/lib/getTsPlanQuote', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestGetTsPlanPreview: mocked.request,
}));
vi.mock('@/features/misc/lib/buyXorMaxAmount', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findBuyXorMaxDai: mocked.maxDai,
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: {} }));
vi.mock('@/features/misc/lib/tonswapConversion', () => ({ requestTonswapConversionQuote: vi.fn() }));
vi.mock('@/indexer/queries/tonswapBurn', () => ({
  TONSWAP_MAINNET_GENESIS: 'mainnet',
  fetchTonswapBurnSnapshot: vi.fn(),
}));

type Props = InstanceType<typeof BuyXorQuickStart>['$props'];
const wrappers: ReturnType<typeof mount>[] = [];
function mountStart(props: Partial<Props> = {}) {
  const wrapper = mount(BuyXorQuickStart, {
    props: { source: 'card', amount: '20', paymentAsset: 'USD', canContinue: true, ...props } as Props,
    global: {
      stubs: { SButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' } },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function preview(result: Record<string, unknown>) {
  mocked.request.mockImplementation(async (request) => ({
    feeComponents: [],
    limitations: [],
    costCoverage: 'partial',
    ...request,
    ...result,
  }));
}
function button(wrapper: ReturnType<typeof mountStart>, text: string) {
  return wrapper.findAll('button').find((value) => value.text() === text);
}
async function settle() {
  await vi.advanceTimersByTimeAsync(650);
  await flushPromises();
}
const defaultDelimiters = { ...FPNumber.DELIMITERS_CONFIG };

describe('Buy XOR start screen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.request.mockReset();
    mocked.maxDai.mockReset().mockResolvedValue('23.88');
    preview({
      state: 'ready',
      feasible: true,
      spendableXor: '2.621118',
      daiAmount: '15',
      expiresAt: Date.now() + 30_000,
    });
  });
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    FPNumber.DELIMITERS_CONFIG = { ...defaultDelimiters };
    vi.useRealTimers();
  });

  it('picks card and a starting budget when nothing is chosen, without opening anything', async () => {
    const wrapper = mountStart({ source: null, amount: '' });
    expect(wrapper.emitted('selectSource')).toEqual([['card']]);
    await wrapper.setProps({ source: 'card' });
    expect(wrapper.emitted('update:amount')).toEqual([['20']]);
    await wrapper.setProps({ amount: '' });
    expect(wrapper.emitted('update:amount')).toHaveLength(1);
    expect(wrapper.emitted('continue')).toBeUndefined();
  });

  it('shows the XOR estimate and leaves continuing to the page gate', async () => {
    const wrapper = mountStart({ canContinue: false });
    await settle();
    expect(mocked.request).toHaveBeenCalledWith(
      { source: 'card', amount: '20', paymentAsset: 'USD', purpose: 'xor' },
      expect.anything()
    );
    expect(wrapper.get('[data-test-name="buyXorEstimate"]').text()).toBe('≈ 2.6211 XOR');
    expect(wrapper.text()).toContain('buyXor.start.cardFees');
    expect(wrapper.emitted('preview')?.at(-1)?.[0]).toMatchObject({ state: 'ready', spendableXor: '2.621118' });
    const next = wrapper.get('[data-test-name="buyXorContinue"]');
    expect(next.attributes('disabled')).toBeDefined();
    await wrapper.setProps({ canContinue: true });
    await next.trigger('click');
    expect(wrapper.emitted('continue')).toHaveLength(1);
  });

  it('offers the largest amount the SORA market can take when the amount is too large', async () => {
    preview({ state: 'blocked', feasible: false, reason: 'price-impact', daiAmount: '41.6' });
    const wrapper = mountStart({ amount: '50' });
    await settle();
    expect(mocked.maxDai).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test-name="buyXorEstimate"]').exists()).toBe(false);
    expect(wrapper.get('[data-test-name="buyXorProblem"]').text()).toContain(
      'buyXor.start.tooBig {"amount":"28\u00a0USD"}'
    );
    expect(wrapper.get('[data-test-name="buyXorMax"]').text()).toContain('buyXor.start.max {"amount":"28\u00a0USD"}');
    await button(wrapper, 'getTs.preview.useAmount {"amount":"28","asset":"USD"}')!.trigger('click');
    expect(wrapper.emitted('update:amount')).toEqual([['28']]);
  });

  it('reuses one maximum search for a minute of estimates', async () => {
    preview({ state: 'blocked', feasible: false, reason: 'price-impact', daiAmount: '41.6' });
    const wrapper = mountStart({ amount: '50' });
    await settle();
    await wrapper.setProps({ amount: '60' });
    await settle();
    expect(mocked.maxDai).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(61_000);
    await wrapper.setProps({ amount: '70' });
    await settle();
    expect(mocked.maxDai).toHaveBeenCalledTimes(2);
  });

  it('hides the maximum when the search finds none and offers the smaller-amount search instead', async () => {
    mocked.maxDai.mockResolvedValue(null);
    preview({ state: 'blocked', feasible: false, reason: 'price-impact', daiAmount: '41.6' });
    const wrapper = mountStart({ amount: '50' });
    await settle();
    expect(wrapper.find('[data-test-name="buyXorMax"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('buyXor.start.tooBigUnknown');
    expect(button(wrapper, 'getTs.preview.findAmount')).toBeDefined();
  });

  it('sends card buyers to crypto when the card minimum is above the market maximum', async () => {
    preview({ state: 'blocked', feasible: false, reason: 'card-minimum', providerMinimumUsd: '30' });
    const wrapper = mountStart({ amount: '10' });
    await settle();
    expect(wrapper.text()).toContain('buyXor.start.cardMinimum {"amount":"30\u00a0USD"}');
    await button(wrapper, 'getTs.preview.useAmount {"amount":"30","asset":"USD"}')!.trigger('click');
    expect(wrapper.emitted('update:amount')).toEqual([['30']]);
    preview({ state: 'blocked', feasible: false, reason: 'price-impact', daiAmount: '25' });
    await wrapper.setProps({ amount: '30' });
    await settle();
    expect(wrapper.text()).toContain('buyXor.start.cardBlocked {"minimum":"30\u00a0USD","maximum":"28\u00a0USD"}');
    await button(wrapper, 'buyXor.start.useCrypto')!.trigger('click');
    expect(wrapper.emitted('selectSource')).toEqual([['ethereum']]);
  });

  it('keeps an unresolved purchase locked and requests no new quotes', async () => {
    const wrapper = mountStart({ locked: true, amount: '25' });
    await settle();
    expect(mocked.request).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('buyXor.start.inProgress {"amount":"25 USD"}');
    expect(wrapper.find('[data-test-name="buyXorAmount"]').exists()).toBe(false);
    const crypto = wrapper.get('[data-source="ethereum"]');
    expect(crypto.attributes('disabled')).toBeDefined();
    await crypto.trigger('click');
    expect(wrapper.emitted('selectSource')).toBeUndefined();
    await button(wrapper, 'buyXor.resumeTitle')!.trigger('click');
    expect(wrapper.emitted('continue')).toHaveLength(1);
    expect(wrapper.emitted('update:amount')).toBeUndefined();
  });

  it('lists the approvals for the chosen route and skips conversion for DAI', async () => {
    const wrapper = mountStart({ source: 'ethereum', paymentAsset: 'DAI', amount: '' });
    expect(wrapper.findAll('.buy-xor-start__next li').map((item) => item.text())).toEqual([
      'buyXor.start.steps.walletsEthereum',
      'buyXor.start.steps.transfer',
      'buyXor.start.steps.swap',
    ]);
    expect(wrapper.emitted('update:amount')).toBeUndefined();
    await wrapper.get('[data-source="card"]').trigger('click');
    expect(wrapper.emitted('selectSource')).toEqual([['card']]);
  });

  it('formats the advisory maximum with the app language delimiters and emits the canonical amount', async () => {
    FPNumber.DELIMITERS_CONFIG = { thousand: '.', decimal: ',' };
    preview({ state: 'blocked', feasible: false, reason: 'price-impact', daiAmount: '30' });
    const wrapper = mountStart({ source: 'ethereum', paymentAsset: 'ETH', amount: '0.01' });
    await settle();
    expect(wrapper.text()).toContain('buyXor.start.tooBig {"amount":"0,0078\u00a0ETH"}');
    await button(wrapper, 'getTs.preview.useAmount {"amount":"0.0078","asset":"ETH"}')!.trigger('click');
    expect(wrapper.emitted('update:amount')).toEqual([['0.0078']]);
  });

  it('offers USDT when native TON cannot be quoted', async () => {
    preview({ state: 'unavailable', feasible: null, reason: 'native-ton' });
    const wrapper = mountStart({ source: 'ton', paymentAsset: 'TON', amount: '5' });
    await settle();
    expect(wrapper.text()).toContain('buyXor.start.nativeTon');
    await button(wrapper, 'buyXor.start.useUsdt')!.trigger('click');
    expect(wrapper.emitted('update:paymentAsset')).toEqual([['USDT']]);
  });

  it('keeps the last estimate readable while the same amount refreshes', async () => {
    const wrapper = mountStart();
    await settle();
    let finish!: (value: unknown) => void;
    mocked.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(wrapper.emitted('preview')?.at(-1)?.[0]).toMatchObject({ state: 'loading', amount: '20' });
    const estimate = wrapper.get('[data-test-name="buyXorEstimate"]');
    expect(estimate.text()).toBe('≈ 2.6211 XOR');
    expect(estimate.classes()).toContain('buy-xor-start__total--refreshing');
    expect(wrapper.text()).toContain('getTs.preview.loading');
    await wrapper.setProps({ amount: '21' });
    expect(wrapper.find('[data-test-name="buyXorEstimate"]').exists()).toBe(false);
    finish({ state: 'ready', feasible: true, spendableXor: '9', feeComponents: [], limitations: [] });
  });

  it('treats missing SORA fees like the connection still starting', async () => {
    preview({ state: 'unavailable', feasible: null, reason: 'fees-unavailable' });
    const wrapper = mountStart();
    await settle();
    expect(wrapper.get('[data-test-name="buyXorProblem"]').text()).toBe('buyXor.start.connecting');
    expect(wrapper.find('.buy-xor-start__dash').exists()).toBe(false);
  });

  it('offers the maximum only when it is a real step up from the typed amount', async () => {
    // Each USD buys 22/27 DAI, so the scaled maximum stays 27 × 23.88 / 22 × 0.98 = 28.7 → 28 USD.
    mocked.request.mockImplementation(async (request) => ({
      ...request,
      state: 'ready',
      feasible: true,
      spendableXor: '3.69',
      daiAmount: new FPNumber(request.amount).mul(new FPNumber('22')).div(new FPNumber('27')).toString(),
      feeComponents: [],
      limitations: [],
      costCoverage: 'partial',
      expiresAt: Date.now() + 30_000,
    }));
    const wrapper = mountStart({ amount: '27' });
    await settle();
    expect(wrapper.get('[data-test-name="buyXorMax"]').text()).toBe('buyXor.start.max {"amount":"28\u00a0USD"}');
    await wrapper.setProps({ amount: '20' });
    await settle();
    await wrapper.get('[data-test-name="buyXorMax"] button').trigger('click');
    expect(wrapper.emitted('update:amount')?.at(-1)).toEqual(['28']);
  });

  it('retries an unavailable estimate on request', async () => {
    preview({ state: 'unavailable', feasible: null, reason: 'liquidity-unavailable' });
    const wrapper = mountStart();
    await settle();
    expect(wrapper.text()).toContain('buyXor.start.noPrice');
    expect(mocked.request).toHaveBeenCalledTimes(1);
    await button(wrapper, 'getTs.retry')!.trigger('click');
    await settle();
    expect(mocked.request).toHaveBeenCalledTimes(2);
  });
});
