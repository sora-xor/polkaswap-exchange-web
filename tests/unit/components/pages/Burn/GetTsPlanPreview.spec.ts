import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GetTsPlanPreview from '@/features/misc/components/burn/GetTsPlanPreview.vue';
const mocked = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ nodeIsConnected: true, networkFees: {}, slippageTolerance: '1', moonpayApiKey: '' }),
}));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/misc/lib/getTsPlanQuote', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestGetTsPlanPreview: mocked.request,
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: {} }));
vi.mock('@/features/misc/lib/tonswapConversion', () => ({ requestTonswapConversionQuote: vi.fn() }));
vi.mock('@/indexer/queries/tonswapBurn', () => ({
  TONSWAP_MAINNET_GENESIS: 'mainnet',
  fetchTonswapBurnSnapshot: vi.fn(),
}));
const ready = {
  state: 'ready',
  feasible: true,
  feeComponents: [],
  limitations: [],
  costCoverage: 'complete',
  estimatedTs: '50',
  burnableXor: '1',
};
describe('Get TS amount-first preview UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.request
      .mockReset()
      .mockImplementation(async (request) => ({ ...request, ...ready, expiresAt: Date.now() + 30000 }));
  });
  afterEach(() => vi.useRealTimers());
  it('automatically quotes after debounce without a manual quote or wallet action', async () => {
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'xor', paymentAsset: 'XOR', amount: '1.002' } });
    expect(mocked.request).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(mocked.request).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('50');
    expect(wrapper.find('button').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(30001);
    expect(mocked.request).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
  it('emits edits and immediately revokes stale evidence before a changed amount resolves', async () => {
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'sora', paymentAsset: 'DAI', amount: '10' } });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.get('input').setValue('20');
    expect(wrapper.emitted('update:amount')?.at(-1)).toEqual(['20']);
    await wrapper.setProps({ amount: '20' });
    expect(wrapper.emitted('preview')?.at(-1)?.[0]).toMatchObject({ state: 'loading', amount: '20', feasible: null });
    wrapper.unmount();
  });
  it('ignores late provider results and never starts a request for invalid amounts', async () => {
    let finish!: (value: unknown) => void;
    mocked.request.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'card', amount: '100' } });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.setProps({ amount: '0' });
    finish(ready);
    await flushPromises();
    expect(wrapper.emitted('preview')?.at(-1)?.[0]).toMatchObject({ state: 'blocked', reason: 'invalid-amount' });
    expect(mocked.request).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
  it('shows retry for unavailable evidence and does not invent a TS amount', async () => {
    mocked.request.mockResolvedValue({
      state: 'unavailable',
      feasible: null,
      reason: 'campaign-unavailable',
      feeComponents: [],
      limitations: [],
      costCoverage: 'unavailable',
    });
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'xor', amount: '1' } });
    await vi.advanceTimersByTimeAsync(650);
    expect(wrapper.text()).toContain('getTs.preview.reason.campaign-unavailable');
    expect(wrapper.find('.plan-preview__total').exists()).toBe(false);
    expect(wrapper.get('button').text()).toBe('getTs.preview.retry');
    wrapper.unmount();
  });
  it('labels generic XOR estimates before gas without rendering TS or campaign evidence', async () => {
    mocked.request.mockImplementation(async (request) => ({
      ...request,
      ...ready,
      spendableXor: '1.002',
      estimatedTs: undefined,
      burnableXor: undefined,
      daiAmount: '10',
      paymentEthAmount: '0.003',
      costCoverage: 'partial',
      expiresAt: Date.now() + 30000,
    }));
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'card', amount: '100', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    expect(mocked.request.mock.calls[0]?.[0]).toMatchObject({ purpose: 'xor' });
    expect(mocked.request.mock.calls[0]?.[1].fees.burnFeeCodec).toBeUndefined();
    expect(wrapper.get('.plan-preview__total').text()).toContain('1.002 XOR');
    expect(wrapper.text()).toContain('getTs.preview.receiveXorBeforeGas');
    expect(wrapper.text()).toContain('buyXor.preview.cardEth');
    expect(wrapper.text()).toContain('buyXor.preview.notice');
    for (const key of [
      'getTs.preview.claim',
      'getTs.preview.futureTs',
      'getTs.preview.checkpoint',
      'getTs.preview.burnable',
    ])
      expect(wrapper.text()).not.toContain(key);
    wrapper.unmount();
  });
  it('keeps the gas exclusion visible while intermediate delivery and fees stay in closed details', async () => {
    mocked.request.mockImplementation(async (request) => ({
      ...request,
      ...ready,
      spendableXor: '3.141592653589793',
      costCoverage: 'partial',
      paymentEthAmount: '0.007',
      daiAmount: '20',
      daiIntent: '19.8',
      feeComponents: [{ stage: 'provider', amount: '2.99', symbol: 'USD', included: true }],
      expiresAt: Date.now() + 30000,
    }));
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'card', amount: '25', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    expect(wrapper.get('label').text()).toBe('getTs.preview.youPay');
    expect(wrapper.get('.plan-preview__input-note').text()).toBe('getTs.preview.cardFeesIncluded');
    const outcome = wrapper.get('.plan-preview__outcome');
    expect(outcome.text()).toContain('getTs.preview.receiveXorBeforeGas');
    expect(outcome.text()).toContain('3.141592 XOR');
    expect(outcome.text()).toContain('getTs.preview.remainingCosts');
    expect(outcome.text()).toContain('getTs.preview.ethereumGasSummary');
    expect(outcome.text()).not.toContain('buyXor.preview.cardEth');
    expect(outcome.text()).not.toContain('getTs.preview.dai');
    const details = wrapper.get('details');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.text()).toContain('buyXor.preview.cardEth');
    expect(details.text()).toContain('getTs.preview.additionalGas');
    expect(details.text()).toContain('getTs.preview.dai');
    expect(details.text()).toContain('2.99 USD');
    expect(wrapper.emitted('preview')?.at(-1)?.[0]).toMatchObject({ spendableXor: '3.141592653589793' });
    wrapper.unmount();
  });
  it('distinguishes TON gas from SORA-only costs without implying a funded TS claim', async () => {
    mocked.request.mockImplementation(async (request) => ({
      ...request,
      ...ready,
      costCoverage: request.source === 'ton' ? 'partial' : 'complete',
      expiresAt: Date.now() + 30000,
    }));
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'ton', amount: '10' } });
    await vi.advanceTimersByTimeAsync(650);
    expect(wrapper.get('.plan-preview__gas').text()).toContain('getTs.preview.tonGasSummary');
    expect(wrapper.get('.plan-preview__outcome').text()).toContain('getTs.preview.beforeGasTs');
    expect(wrapper.get('.plan-preview__outcome').text()).not.toContain('getTs.preview.burnable');
    expect(wrapper.get('details').text()).toContain('getTs.preview.burnable');
    expect(wrapper.get('.plan-preview__claim').text()).toBe('getTs.preview.claim');
    await wrapper.setProps({ source: 'sora', paymentAsset: 'DAI' });
    await vi.advanceTimersByTimeAsync(650);
    expect(wrapper.find('.plan-preview__gas').exists()).toBe(false);
    expect(wrapper.get('.plan-preview__outcome').text()).toContain('getTs.preview.futureTs');
    wrapper.unmount();
  });
  it('revokes the previous preview when switching between XOR and TS purposes', async () => {
    const wrapper = mount(GetTsPlanPreview, {
      props: { source: 'sora', paymentAsset: 'DAI', amount: '10', purpose: 'xor' },
    });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.setProps({ purpose: 'ts' });
    expect(wrapper.emitted('preview')?.at(-1)?.[0]).toMatchObject({ state: 'loading', purpose: 'ts', feasible: null });
    await vi.advanceTimersByTimeAsync(650);
    expect(mocked.request.mock.calls[1]?.[0]).toMatchObject({ purpose: 'ts' });
    wrapper.unmount();
  });
  it('offers the provider minimum as an explicit edit without starting a purchase', async () => {
    mocked.request.mockImplementation(async (request) => ({
      ...request,
      ...ready,
      state: 'blocked',
      feasible: false,
      reason: 'card-minimum',
      providerMinimumUsd: '20',
    }));
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'card', amount: '3', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('update:amount')?.at(-1)).toEqual(['20']);
    expect(mocked.request).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
  it('checks smaller budgets on request and only changes the amount after selection', async () => {
    mocked.request.mockImplementation(async (request) => ({
      ...request,
      ...ready,
      ...(request.amount === '25'
        ? { spendableXor: '3', expiresAt: Date.now() + 30000 }
        : {
            state: 'blocked',
            feasible: false,
            reason: 'price-impact',
          }),
    }));
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'card', amount: '100', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(mocked.request.mock.calls.map(([request]) => request.amount)).toEqual(['100', '50', '25']);
    expect(wrapper.emitted('update:amount')).toBeUndefined();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'getTs.preview.useAmount')!
      .trigger('click');
    expect(wrapper.emitted('update:amount')?.at(-1)).toEqual(['25']);
    wrapper.unmount();
  });
  it('discards an in-flight smaller amount suggestion when source input changes', async () => {
    let resolve!: (value: unknown) => void;
    mocked.request
      .mockImplementationOnce(async (request) => ({
        ...request,
        ...ready,
        state: 'blocked',
        feasible: false,
        reason: 'price-impact',
      }))
      .mockImplementation(
        () =>
          new Promise((finish) => {
            resolve = finish;
          })
      );
    const wrapper = mount(GetTsPlanPreview, { props: { source: 'card', amount: '100', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.get('button').trigger('click');
    await wrapper.setProps({ amount: '20' });
    resolve({
      source: 'card',
      amount: '50',
      purpose: 'xor',
      paymentAsset: 'USD',
      ...ready,
      expiresAt: Date.now() + 30000,
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain('getTs.preview.useAmount');
    expect(wrapper.emitted('update:amount')).toBeUndefined();
    wrapper.unmount();
  });
});
