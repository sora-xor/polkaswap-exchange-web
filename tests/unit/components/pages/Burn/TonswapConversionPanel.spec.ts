import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, reactive, ref } from 'vue';
import Panel from '@/features/misc/components/burn/TonswapConversionPanel.vue';

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  execute: vi.fn(),
  network: vi.fn(),
  feeData: vi.fn(),
  balance: vi.fn(),
  ethBalance: vi.fn(),
  estimateGas: vi.fn(),
  signerAddress: vi.fn(),
  receipt: vi.fn(),
  progress: vi.fn(),
  switch: vi.fn(),
}));
const evmAddress = ref('0x1111111111111111111111111111111111111111');
const tonAddress = ref('');
const tonChain = ref('');
const web3 = reactive({ evmProviderNetwork: 1, evmProvider: 'test-wallet' });
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/composables/useWeb3Connection', () => ({ useWeb3Connection: () => ({ evmAddress }) }));
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => web3 }));
vi.mock('@/features/misc/composables/useTonswapTonWallet', () => ({
  useTonswapTonWallet: () => ({ address: tonAddress, chain: tonChain, connect: vi.fn(), disconnect: vi.fn() }),
  getTonswapTonWallet: vi.fn(),
}));
vi.mock('@/utils/ethers-util', () => {
  const provider = {
    getNetwork: mocks.network,
    getFeeData: mocks.feeData,
    getBalance: mocks.ethBalance,
    waitForTransaction: mocks.receipt,
    send: mocks.switch,
  };
  return {
    default: {
      getEthersInstance: () => provider,
      getSigner: async () => ({ estimateGas: mocks.estimateGas, getAddress: mocks.signerAddress }),
    },
  };
});
vi.mock('@/features/misc/lib/getTsConversionProgress', () => ({
  readGetTsConversionProgress: mocks.progress,
}));
vi.mock('ethers', async (original) => ({
  ...(await original<typeof import('ethers')>()),
  Contract: class {
    balanceOf = mocks.balance;
  },
}));
vi.mock('@/features/misc/lib/tonswapConversion', async (original) => ({
  ...(await original<typeof import('@/features/misc/lib/tonswapConversion')>()),
  requestTonswapConversionQuote: mocks.quote,
  executeTonswapConversionQuote: mocks.execute,
}));
const LiquidityStub = defineComponent({
  name: 'TonswapLiquidityCheck',
  props: ['amount', 'paused', 'compact', 'purpose'],
  emits: ['checked'],
  template: '<div />',
});
const baseQuote = () => ({
  request: { source: 'eth', target: 'dai', amount: '0.01', fromAddress: evmAddress.value, toAddress: evmAddress.value },
  inputAmount: '10000000000000000',
  outputAmount: '10000000000000000000',
  minOutputAmount: '9900000000000000000',
  outputDecimals: 18,
  priceImpactPercent: '0.1',
  fees: [],
  nativeValue: '10150000000000000',
  nativeFee: '150000000000000',
  quotedAt: Date.now(),
  expiresAt: Date.now() + 30000,
  executionEnabled: true,
  transaction: {
    type: 'evm',
    to: '0x1111111111111111111111111111111111111111',
    data: '0x1234',
    value: '10150000000000000',
  },
});
function mountPanel(props: Record<string, unknown> = {}) {
  return mount(Panel, {
    props: { source: 'ethereum', paymentAmount: '0.01', ...props },
    global: { stubs: { TonswapLiquidityCheck: LiquidityStub } },
  });
}
async function advanceQuote() {
  await vi.advanceTimersByTimeAsync(650);
  await flushPromises();
}
async function allowLiquidity(wrapper: ReturnType<typeof mountPanel>) {
  wrapper.getComponent(LiquidityStub).vm.$emit('checked', {
    allowed: true,
    expiresAt: Date.now() + 30000,
    amount: wrapper.getComponent(LiquidityStub).props('amount') ?? '10',
  });
  await flushPromises();
}
function reviewButton(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper.findAll('button').find((item) => item.text() === 'getTs.conversion.reviewWallet')!;
}

describe('Get TS automatic conversion review', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T00:00:00Z'));
    evmAddress.value = '0x1111111111111111111111111111111111111111';
    tonAddress.value = '';
    tonChain.value = '';
    web3.evmProviderNetwork = 1;
    web3.evmProvider = 'test-wallet';
    mocks.quote.mockReset().mockImplementation(async (request) => ({ ...baseQuote(), request }));
    mocks.network.mockReset().mockResolvedValue({ chainId: 1n });
    mocks.feeData.mockReset().mockResolvedValue({ maxFeePerGas: 1_000_000_000n, gasPrice: null });
    mocks.execute.mockReset().mockResolvedValue(`0x${'a'.repeat(64)}`);
    mocks.balance.mockReset().mockResolvedValueOnce(0n).mockResolvedValue(1000000000000000000n);
    mocks.ethBalance.mockReset().mockResolvedValue(1000000000000000000n);
    mocks.estimateGas.mockReset().mockResolvedValue(250000n);
    mocks.signerAddress.mockReset().mockResolvedValue(evmAddress.value);
    mocks.receipt.mockReset().mockResolvedValue({ status: 1 });
    mocks.progress.mockReset().mockResolvedValue({ state: 'received', amount: '1' });
  });
  afterEach(() => vi.useRealTimers());
  it('announces preparation and retains a valid returned hash after the signing wallet changes, without claiming completion', async () => {
    let finish!: (hash: string) => void;
    mocks.execute.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mountPanel();
    await advanceQuote();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    expect(wrapper.emitted('preparing')).toEqual([[true]]);
    evmAddress.value = '0x2222222222222222222222222222222222222222';
    await flushPromises();
    const hash = `0x${'a'.repeat(64)}`;
    finish(hash);
    await flushPromises();
    expect(wrapper.emitted('submitted')).toEqual([[{ transactionHash: hash }]]);
    expect(wrapper.emitted('completed')).toBeUndefined();
    expect(mocks.progress).not.toHaveBeenCalled();
    expect(wrapper.emitted('preparing')).toEqual([[true], [false]]);
    expect(mocks.execute).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it('passes purchase purpose to funding liquidity checks and keeps explicit signing review', async () => {
    const wrapper = mountPanel({ purpose: 'xor' });
    await advanceQuote();
    expect(wrapper.getComponent(LiquidityStub).props('purpose')).toBe('xor');
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    expect(mocks.execute).not.toHaveBeenCalled();
    await allowLiquidity(wrapper);
    expect(reviewButton(wrapper).attributes('disabled')).toBeUndefined();
    await wrapper.setProps({ purpose: 'ts' });
    await advanceQuote();
    expect(wrapper.getComponent(LiquidityStub).props('purpose')).toBe('ts');
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('automatically quotes planned inputs and only signs after explicit review and liquidity approval', async () => {
    const wrapper = mountPanel();
    await advanceQuote();
    expect(wrapper.getComponent(LiquidityStub).props('purpose')).toBe('ts');
    expect(mocks.quote).toHaveBeenCalledOnce();
    expect(wrapper.findAll('button').some((item) => item.text() === 'getTs.conversion.quote')).toBe(false);
    expect(wrapper.text()).toContain('0.000196 ETH');
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    expect(mocks.execute).not.toHaveBeenCalled();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(wrapper.emitted('submitted')?.[0]).toEqual([{ transactionHash: `0x${'a'.repeat(64)}` }]);
    expect(wrapper.emitted('completed')?.[0]).toEqual([
      { receivedAsset: 'DAI', amount: '1', transactionHash: `0x${'a'.repeat(64)}` },
    ]);
    expect(mocks.balance).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(mocks.quote).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it('emits the submitted hash before waiting and reports only the verified receipt DAI amount', async () => {
    let finish!: (receipt: { status: number }) => void;
    mocks.receipt.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    mocks.balance.mockResolvedValue(999000000000000000000n);
    mocks.progress.mockResolvedValue({ state: 'received', amount: '0.875' });
    const wrapper = mountPanel();
    await advanceQuote();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.emitted('submitted')).toEqual([[{ transactionHash: `0x${'a'.repeat(64)}` }]]);
    expect(wrapper.emitted('completed')).toBeUndefined();
    expect(mocks.progress).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('getTs.conversion.submitted');
    finish({ status: 1 });
    await flushPromises();
    expect(wrapper.emitted('completed')).toEqual([
      [{ receivedAsset: 'DAI', amount: '0.875', transactionHash: `0x${'a'.repeat(64)}` }],
    ]);
    expect(mocks.balance).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each(['pending', 'unavailable', 'failed'])(
    'never completes from a %s receipt result or unrelated balance',
    async (state) => {
      mocks.progress.mockResolvedValue({ state });
      mocks.balance.mockResolvedValue(999000000000000000000n);
      const wrapper = mountPanel();
      await advanceQuote();
      await allowLiquidity(wrapper);
      await reviewButton(wrapper).trigger('click');
      await flushPromises();
      expect(wrapper.emitted('submitted')).toHaveLength(1);
      expect(wrapper.emitted('completed')).toBeUndefined();
      expect(mocks.balance).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it('leaves confirmation to the parent when it removes the panel after submission', async () => {
    const onCompleted = vi.fn();
    const onSubmitted = vi.fn(() => wrapper.unmount());
    const wrapper = mountPanel({ onSubmitted, onCompleted });
    await advanceQuote();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    expect(onSubmitted).toHaveBeenCalledWith({ transactionHash: `0x${'a'.repeat(64)}` });
    expect(onCompleted).not.toHaveBeenCalled();
    expect(mocks.receipt).not.toHaveBeenCalled();
    expect(mocks.progress).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'invalid-hash'])('never emits submission after an %s adapter result', async (result) => {
    if (result === 'rejected') mocks.execute.mockRejectedValueOnce(new Error('User rejected'));
    else mocks.execute.mockResolvedValueOnce('unsigned-local-id');
    const wrapper = mountPanel();
    await advanceQuote();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.emitted('submitted')).toBeUndefined();
    expect(wrapper.emitted('completed')).toBeUndefined();
    expect(mocks.receipt).not.toHaveBeenCalled();
    expect(mocks.progress).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each(['account', 'chain', 'unmount'])('discards receipt confirmation after an %s change', async (change) => {
    let finish!: (result: { state: string; amount: string }) => void;
    mocks.progress.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const onSubmitted = vi.fn();
    const onCompleted = vi.fn();
    const wrapper = mountPanel({ onSubmitted, onCompleted });
    await advanceQuote();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    const isCurrent = mocks.progress.mock.calls[0][3];
    expect(isCurrent()).toBe(true);
    if (change === 'account') evmAddress.value = '0x2222222222222222222222222222222222222222';
    else if (change === 'chain') web3.evmProviderNetwork = 10;
    else wrapper.unmount();
    expect(isCurrent()).toBe(false);
    finish({ state: 'received', amount: '1' });
    await flushPromises();
    expect(onSubmitted).toHaveBeenCalledOnce();
    expect(onCompleted).not.toHaveBeenCalled();
    if (change !== 'unmount') wrapper.unmount();
  });
  it('debounces edits and synchronizes payment values with the parent', async () => {
    const wrapper = mountPanel({ paymentAmount: '' });
    await wrapper.get('input').setValue('0.01');
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get('input').setValue('0.02');
    await wrapper.get('select').setValue('usdt-ethereum');
    await vi.advanceTimersByTimeAsync(649);
    expect(mocks.quote).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(mocks.quote).toHaveBeenCalledOnce();
    expect(mocks.quote.mock.calls[0]?.[0]).toMatchObject({ amount: '0.02', source: 'usdt-ethereum' });
    expect(wrapper.emitted('update:paymentAmount')?.at(-1)).toEqual(['0.02']);
    expect(wrapper.emitted('update:paymentAsset')?.at(-1)).toEqual(['usdt-ethereum']);
    await wrapper.setProps({ paymentAmount: '20', paymentAsset: 'eth' });
    await advanceQuote();
    expect(mocks.quote.mock.calls.at(-1)?.[0]).toMatchObject({ amount: '20', source: 'eth' });
    wrapper.unmount();
  });
  it('revokes old terms immediately on account or chain change and ignores a late quote', async () => {
    let finish!: (quote: ReturnType<typeof baseQuote>) => void;
    mocks.quote.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mountPanel();
    await advanceQuote();
    evmAddress.value = '0x2222222222222222222222222222222222222222';
    finish(baseQuote());
    await flushPromises();
    expect(wrapper.findComponent(LiquidityStub).exists()).toBe(false);
    await advanceQuote();
    expect(wrapper.findComponent(LiquidityStub).exists()).toBe(true);
    web3.evmProviderNetwork = 10;
    mocks.network.mockResolvedValue({ chainId: 10n });
    await flushPromises();
    expect(wrapper.findComponent(LiquidityStub).exists()).toBe(false);
    await advanceQuote();
    expect(wrapper.text()).toContain('getTs.conversion.switchEthereum');
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('refreshes expired quotes without carrying an earlier liquidity approval or signing automatically', async () => {
    const wrapper = mountPanel();
    await advanceQuote();
    await allowLiquidity(wrapper);
    mocks.quote.mockImplementationOnce(async (request) => ({
      ...baseQuote(),
      request,
      outputAmount: '8000000000000000000',
      minOutputAmount: '7920000000000000000',
    }));
    await vi.advanceTimersByTimeAsync(31_000);
    await flushPromises();
    expect(mocks.quote).toHaveBeenCalledTimes(2);
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.getComponent(LiquidityStub).props('amount')).toBe('8');
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('freezes automatic refresh while signing and never executes newly quoted terms under the previous click', async () => {
    let finish!: (hash: string) => void;
    mocks.execute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mountPanel();
    await advanceQuote();
    await allowLiquidity(wrapper);
    const reviewed = mocks.quote.mock.results[0];
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.getComponent(LiquidityStub).props('paused')).toBe(true);
    expect(mocks.execute.mock.calls[0]?.[1].canContinue()).toBe(true);
    await allowLiquidity(wrapper);
    expect(mocks.execute.mock.calls[0]?.[1].canContinue()).toBe(false);
    await vi.advanceTimersByTimeAsync(31_000);
    expect(mocks.quote).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.execute.mock.calls[0]?.[0]).toEqual(await reviewed.value);
    expect(mocks.execute.mock.calls[0]?.[1].canContinue()).toBe(false);
    finish(`0x${'a'.repeat(64)}`);
    await flushPromises();
    wrapper.unmount();
  });
  it('requires a new click after an expired wallet review', async () => {
    const { TonswapConversionError } = await import('@/features/misc/lib/tonswapConversion');
    mocks.execute.mockRejectedValueOnce(new TonswapConversionError('EXPIRED'));
    const wrapper = mountPanel();
    await advanceQuote();
    await allowLiquidity(wrapper);
    await reviewButton(wrapper).trigger('click');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(mocks.quote).toHaveBeenCalledTimes(2);
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
  it.each(['', '999'])(
    'derives TON downstream liquidity from the current quote, ignoring saved DAI intent %j',
    async (daiIntent) => {
      tonAddress.value = 'ton-account';
      tonChain.value = '-239';
      mocks.quote.mockImplementation(async (request) =>
        request.source === 'usdt-ton'
          ? {
              ...baseQuote(),
              request,
              executionEnabled: false,
              outputAmount: '10000000000000000',
              minOutputAmount: '9900000000000000',
              transaction: { type: 'ton' },
            }
          : { ...baseQuote(), request }
      );
      const wrapper = mountPanel({ source: 'ton', purpose: 'xor', paymentAmount: '10', daiIntent });
      await advanceQuote();
      expect(mocks.quote.mock.calls[1][0]).toEqual({
        source: 'eth',
        target: 'dai',
        amount: '0.0099',
        fromAddress: evmAddress.value,
        toAddress: evmAddress.value,
      });
      expect(wrapper.getComponent(LiquidityStub).props('amount')).toBe('10');
      expect(wrapper.getComponent(LiquidityStub).props('purpose')).toBe('xor');
      expect(reviewButton(wrapper)).toBeUndefined();
      expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(false);
      await allowLiquidity(wrapper);
      expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(true);
      await wrapper.get('input').setValue('20');
      await wrapper.setProps({ daiIntent: '' });
      expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(false);
      mocks.quote.mockImplementation(async (request) =>
        request.source === 'usdt-ton'
          ? {
              ...baseQuote(),
              request,
              executionEnabled: false,
              outputAmount: '20000000000000000',
              minOutputAmount: '19800000000000000',
              transaction: { type: 'ton' },
            }
          : { ...baseQuote(), request, outputAmount: '20000000000000000000' }
      );
      await advanceQuote();
      expect(mocks.quote.mock.calls.at(-1)?.[0]).toMatchObject({ source: 'eth', amount: '0.0198' });
      expect(wrapper.getComponent(LiquidityStub).props('amount')).toBe('20');
      expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(false);
      await allowLiquidity(wrapper);
      expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(true);
      expect(mocks.execute).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it.each(['amount', 'account', 'ton-account', 'chain', 'source', 'unmount'])(
    'discards a late downstream quote after a TON %s change',
    async (change) => {
      tonAddress.value = 'ton-account';
      tonChain.value = '-239';
      let finish!: (value: ReturnType<typeof baseQuote>) => void;
      mocks.quote
        .mockImplementationOnce(async (request) => ({
          ...baseQuote(),
          request,
          executionEnabled: false,
          transaction: { type: 'ton' },
        }))
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            })
        );
      const wrapper = mountPanel({ source: 'ton', paymentAmount: '10', daiIntent: '' });
      await advanceQuote();
      expect(mocks.quote).toHaveBeenCalledTimes(2);
      expect(wrapper.findComponent(LiquidityStub).exists()).toBe(false);
      if (change === 'amount') await wrapper.get('input').setValue('20');
      else if (change === 'account') evmAddress.value = '0x2222222222222222222222222222222222222222';
      else if (change === 'ton-account') tonAddress.value = 'new-ton-account';
      else if (change === 'chain') tonChain.value = '-3';
      else if (change === 'source') await wrapper.setProps({ source: 'ethereum' });
      else wrapper.unmount();
      finish(baseQuote());
      await flushPromises();
      expect(mocks.quote.mock.calls[1][1].signal.aborted).toBe(true);
      expect(wrapper.findComponent(LiquidityStub).exists()).toBe(false);
      expect(mocks.execute).not.toHaveBeenCalled();
      if (change !== 'unmount') wrapper.unmount();
    }
  );

  it('retries downstream quote failures without exposing a provider handoff or signing', async () => {
    tonAddress.value = 'ton-account';
    tonChain.value = '-239';
    mocks.quote
      .mockImplementation(async (request) => ({
        ...baseQuote(),
        request,
        ...(request.source === 'usdt-ton' ? { executionEnabled: false, transaction: { type: 'ton' } } : {}),
      }))
      .mockImplementationOnce(async (request) => ({
        ...baseQuote(),
        request,
        executionEnabled: false,
        transaction: { type: 'ton' },
      }))
      .mockRejectedValueOnce(new Error('downstream unavailable'));
    const wrapper = mountPanel({ source: 'ton', paymentAmount: '10', daiIntent: '' });
    await advanceQuote();
    expect(wrapper.text()).toContain('getTs.conversion.errors.quote');
    expect(wrapper.findComponent(LiquidityStub).exists()).toBe(false);
    expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(15000);
    await flushPromises();
    expect(mocks.quote).toHaveBeenCalledTimes(4);
    await allowLiquidity(wrapper);
    expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(true);
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each(['ton-expired', 'downstream-expired', 'downstream-impact'])(
    'does not allow the TON handoff with %s evidence',
    async (kind) => {
      tonAddress.value = 'ton-account';
      tonChain.value = '-239';
      mocks.quote.mockImplementation(async (request) => ({
        ...baseQuote(),
        request,
        ...(request.source === 'usdt-ton' ? { executionEnabled: false, transaction: { type: 'ton' } } : {}),
        ...((request.source === 'usdt-ton' && kind === 'ton-expired') ||
        (request.source === 'eth' && kind === 'downstream-expired')
          ? { quotedAt: Date.now() - 31000, expiresAt: Date.now() - 1000 }
          : {}),
        ...(request.source === 'eth' && kind === 'downstream-impact' ? { priceImpactPercent: '6' } : {}),
      }));
      const wrapper = mountPanel({ source: 'ton', paymentAmount: '10', daiIntent: '' });
      await advanceQuote();
      if (wrapper.findComponent(LiquidityStub).exists()) await allowLiquidity(wrapper);
      if (kind === 'downstream-impact') expect(wrapper.text()).toContain('getTs.preview.reason.conversion-impact');
      expect(wrapper.find('a[href="https://app.symbiosis.finance/swap"]').exists()).toBe(false);
      expect(mocks.execute).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it('keeps the primary action unavailable when bridge gas reserve evidence is missing', async () => {
    mocks.feeData.mockResolvedValue({ maxFeePerGas: null, gasPrice: null });
    const wrapper = mountPanel();
    await advanceQuote();
    expect(wrapper.text()).toContain('getTs.conversion.errors.quote');
    expect(reviewButton(wrapper)).toBeUndefined();
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('rejects liquidity evidence for a different DAI amount', async () => {
    const wrapper = mountPanel();
    await advanceQuote();
    wrapper
      .getComponent(LiquidityStub)
      .vm.$emit('checked', { allowed: true, expiresAt: Date.now() + 30000, amount: '9' });
    await flushPromises();
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('fills an explicit ETH suggestion capped by the card budget after live conversion and bridge fees', async () => {
    const wrapper = mountPanel({ paymentAmount: '', ethBudget: '0.01' });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'getTs.conversion.useAvailableEth')!
      .trigger('click');
    await flushPromises();
    expect(mocks.quote.mock.calls[0]?.[0]).toMatchObject({ source: 'eth', amount: '0.005' });
    // .01 ETH cap - (.0005 conversion margin + .000196 bridge + .00015 native provider fee).
    expect(wrapper.emitted('update:paymentAmount')?.at(-1)).toEqual(['0.009154']);
    expect(mocks.execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(mocks.quote.mock.calls.at(-1)?.[0]).toMatchObject({ amount: '0.009154' });
    expect(wrapper.text()).toContain('getTs.conversion.budgetEstimated');
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('caps the suggestion by the latest actual wallet balance and never fills the full balance', async () => {
    mocks.ethBalance.mockResolvedValueOnce(1000000000000000000n).mockResolvedValue(10000000000000000n);
    const wrapper = mountPanel({ paymentAmount: '', ethBudget: '0.5' });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'getTs.conversion.useAvailableEth')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.emitted('update:paymentAmount')?.at(-1)).toEqual(['0.009154']);
    expect(mocks.execute).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each(['gas', 'fees', 'balance', 'budget', 'account', 'expiry'])(
    'does not fill a suggestion when %s evidence is invalid',
    async (kind) => {
      if (kind === 'gas') mocks.estimateGas.mockResolvedValue(0n);
      if (kind === 'fees') mocks.feeData.mockResolvedValue({ maxFeePerGas: null, gasPrice: null });
      if (kind === 'balance') mocks.ethBalance.mockResolvedValue(846000000000000n);
      if (kind === 'account') mocks.signerAddress.mockResolvedValue('0x2222222222222222222222222222222222222222');
      if (kind === 'expiry')
        mocks.estimateGas.mockImplementation(async () => {
          vi.setSystemTime(Date.now() + 31_000);
          return 250000n;
        });
      const wrapper = mountPanel({ paymentAmount: '', ethBudget: kind === 'budget' ? 'NaN' : '0.01' });
      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'getTs.conversion.useAvailableEth')!
        .trigger('click');
      await flushPromises();
      expect(wrapper.emitted('update:paymentAmount')).toBeUndefined();
      expect(mocks.execute).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it('discards a late gas suggestion after the user edits the amount', async () => {
    let finish!: (value: bigint) => void;
    mocks.estimateGas.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mountPanel({ paymentAmount: '', ethBudget: '0.01' });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'getTs.conversion.useAvailableEth')!
      .trigger('click');
    await flushPromises();
    await wrapper.get('input').setValue('0.002');
    finish(250000n);
    await flushPromises();
    expect(wrapper.emitted('update:paymentAmount')?.at(-1)).toEqual(['0.002']);
    expect(wrapper.emitted('update:paymentAmount')?.some((event) => event[0] === '0.009154')).toBe(false);
    wrapper.unmount();
  });

  it('announces the Ethereum phase before clearing the intermediate amount, including an already-empty amount', async () => {
    const events: string[] = [];
    const wrapper = mountPanel({
      source: 'ton',
      paymentAmount: '',
      paymentAsset: 'usdt-ethereum',
      onPhaseChange: (phase: string) => events.push(`phase:${phase}`),
      'onUpdate:paymentAmount': (amount: string) => events.push(`amount:${amount}`),
    });
    expect(wrapper.emitted('phase-change')?.[0]).toEqual(['ton']);
    events.length = 0;
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'getTs.conversion.continueEthereum')!
      .trigger('click');
    expect(events[0]).toBe('phase:ethereum');
    expect(events).toContain('amount:');
    expect(wrapper.emitted('update:paymentAsset')?.at(-1)).toEqual(['eth']);
    expect(wrapper.get('select').element.value).toBe('eth');
    await wrapper.setProps({ source: 'ethereum' });
    await wrapper.setProps({ source: 'ton' });
    expect(wrapper.emitted('phase-change')?.at(-1)).toEqual(['ton']);
    expect(wrapper.find('select').exists()).toBe(false);
    wrapper.unmount();
  });
});
