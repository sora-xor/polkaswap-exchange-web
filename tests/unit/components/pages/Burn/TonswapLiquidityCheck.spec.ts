import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { Operation } from '@sora-substrate/sdk/build/types';
import TonswapLiquidityCheck from '@/features/misc/components/burn/TonswapLiquidityCheck.vue';

const state = vi.hoisted(() => ({
  quote: vi.fn(),
  chain: {
    isConnected: true,
    genesisHash: { toString: () => '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5' },
    rpc: { liquidityProxy: { quote: vi.fn() } },
  },
}));
const settings = reactive({
  nodeIsConnected: true,
  soraNetwork: 'mainnet',
  networkFees: { [Operation.Swap]: '10000000000000000', [Operation.BurnWithRemark]: '20000000000000000' },
  slippageTolerance: '0.5',
});
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { connection: { api: state.chain } } }));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  }),
}));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settings }));
const output = {
  unwrap: () => ({
    amount: { toString: () => '970000000000000000' },
    amountWithoutImpact: { toString: () => '1000000000000000000' },
  }),
};

describe('Tonswap liquidity check UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.chain.isConnected = true;
    settings.nodeIsConnected = true;
    settings.networkFees[Operation.Swap] = '10000000000000000';
    settings.networkFees[Operation.BurnWithRemark] = '20000000000000000';
    settings.slippageTolerance = '0.5';
    state.chain.rpc.liquidityProxy.quote.mockReset().mockResolvedValue(output);
  });
  afterEach(() => vi.useRealTimers());
  it('revokes funding permission immediately on edit, expiry, and network disconnection', async () => {
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: true, amount: '10' });
    await wrapper.get('input').setValue('11');
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, expiresAt: 0 });
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(30_001);
    expect(state.chain.rpc.liquidityProxy.quote).toHaveBeenCalledTimes(3);
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: true });
    await flushPromises();
    settings.nodeIsConnected = false;
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false });
    wrapper.unmount();
  });
  it('ignores a late response after the intended amount changed', async () => {
    let finish!: (value: typeof output) => void;
    state.chain.rpc.liquidityProxy.quote.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.get('input').setValue('50');
    finish(output);
    await flushPromises();
    expect(wrapper.emitted('checked')?.some((args) => (args[0] as { allowed: boolean }).allowed)).toBe(false);
    wrapper.unmount();
  });
  it('rejects unavailable fee estimates and displays a specific recovery instruction', async () => {
    settings.networkFees[Operation.BurnWithRemark] = '0';
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, reason: 'fees-unavailable' });
    expect(wrapper.text()).toContain('getTs.liquidity.feesUnavailable');
    wrapper.unmount();
  });
  it('uses generic spendable output and ignores missing burn fees only for XOR purchases', async () => {
    settings.networkFees[Operation.BurnWithRemark] = '0';
    const wrapper = mount(TonswapLiquidityCheck, { props: { purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({
      allowed: true,
      spendableXor: '0.935847',
      feeReserve: '0.01',
    });
    expect(wrapper.text()).toContain('buyXor.liquidity.ready');
    expect(wrapper.text()).not.toContain('getTs.liquidity.feeReserve');
    await wrapper.setProps({ purpose: 'ts' });
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, expiresAt: 0 });
    await vi.advanceTimersByTimeAsync(650);
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, reason: 'fees-unavailable' });
    wrapper.unmount();
  });
  it('rejects late purpose-specific evidence after changing the purchase purpose', async () => {
    let finish!: (value: typeof output) => void;
    state.chain.rpc.liquidityProxy.quote.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mount(TonswapLiquidityCheck, { props: { purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(650);
    await wrapper.setProps({ purpose: 'ts' });
    finish(output);
    await flushPromises();
    expect(wrapper.emitted('checked')?.some((args) => (args[0] as { allowed: boolean }).allowed)).toBe(false);
    wrapper.unmount();
  });
  it('blocks a low-impact quote that cannot fund the later burn', async () => {
    state.chain.rpc.liquidityProxy.quote.mockResolvedValue({
      unwrap: () => ({
        amount: { toString: () => '25000000000000000' },
        amountWithoutImpact: { toString: () => '25000000000000000' },
      }),
    });
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, reason: 'fees-insufficient' });
    expect(wrapper.text()).toContain('getTs.liquidity.feesInsufficient');
    wrapper.unmount();
  });
  it('revokes successful evidence when fees or selected slippage change', async () => {
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    settings.networkFees[Operation.Swap] = '11000000000000000';
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, expiresAt: 0 });
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: true });
    settings.slippageTolerance = '3';
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, expiresAt: 0 });
    wrapper.unmount();
  });
  it('ignores an in-flight quote when fee evidence changes', async () => {
    let finish!: (value: typeof output) => void;
    state.chain.rpc.liquidityProxy.quote.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    settings.networkFees[Operation.BurnWithRemark] = '0';
    finish(output);
    await flushPromises();
    expect(wrapper.emitted('checked')?.some((args) => (args[0] as { allowed: boolean }).allowed)).toBe(false);
    wrapper.unmount();
  });
  it('does not extend quote validity when an RPC takes longer than thirty seconds', async () => {
    let finish!: (value: typeof output) => void;
    state.chain.rpc.liquidityProxy.quote.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await vi.advanceTimersByTimeAsync(30_001);
    finish(output);
    await flushPromises();
    expect(wrapper.emitted('checked')?.some((args) => (args[0] as { allowed: boolean }).allowed)).toBe(false);
    wrapper.unmount();
  });
  it('binds the quote to its provided bridge amount and revokes it when that amount changes', async () => {
    const wrapper = mount(TonswapLiquidityCheck, { props: { amount: '12.345' } });
    expect(wrapper.find('input').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(state.chain.rpc.liquidityProxy.quote.mock.calls[0]?.[3]).toBe('12345000000000000000');
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: true, amount: '12.345' });
    await wrapper.setProps({ amount: '13' });
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false, amount: '13' });
    wrapper.unmount();
  });
  it('uses distinct accessible labels and headings for multiple instances on one page', () => {
    const wrapper = mount({
      components: { TonswapLiquidityCheck },
      template: '<div><TonswapLiquidityCheck /><TonswapLiquidityCheck /></div>',
    });
    const sections = wrapper.findAll('section');
    const ids = sections.map((section) => section.get('input').attributes('id'));
    expect(new Set(ids).size).toBe(2);
    for (const section of sections) {
      expect(section.get('label').attributes('for')).toBe(section.get('input').attributes('id'));
      expect(section.attributes('aria-labelledby')).toBe(section.get('h3').attributes('id'));
    }
    expect(new Set(sections.map((section) => section.get('h3').attributes('id'))).size).toBe(2);
    wrapper.unmount();
  });
  it('debounces rapid edits and never needs a manual quote button', async () => {
    const wrapper = mount(TonswapLiquidityCheck, { props: { compact: true } });
    expect(wrapper.find('button').exists()).toBe(false);
    await wrapper.get('input').setValue('1');
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get('input').setValue('12');
    await vi.advanceTimersByTimeAsync(649);
    expect(state.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(state.chain.rpc.liquidityProxy.quote).toHaveBeenCalledOnce();
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: true, amount: '12' });
    expect(wrapper.find('details').exists()).toBe(true);
    wrapper.unmount();
  });
  it('keeps reviewed evidence until expiry but never refreshes while wallet review is paused', async () => {
    const wrapper = mount(TonswapLiquidityCheck);
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    await wrapper.setProps({ paused: true });
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: true });
    await vi.advanceTimersByTimeAsync(31_000);
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ allowed: false });
    expect(state.chain.rpc.liquidityProxy.quote).toHaveBeenCalledOnce();
    await wrapper.setProps({ paused: false });
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(state.chain.rpc.liquidityProxy.quote).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
  it('rounds display only while emitting exact burnable amounts', async () => {
    const wrapper = mount(TonswapLiquidityCheck, { props: { amount: '12.3456789123456789', compact: true } });
    await vi.advanceTimersByTimeAsync(650);
    await flushPromises();
    expect(wrapper.text()).toContain('12.345678');
    expect(wrapper.text()).not.toContain('12.3456789123456789');
    expect(wrapper.emitted('checked')?.at(-1)?.[0]).toMatchObject({ amount: '12.3456789123456789' });
    wrapper.unmount();
  });
});
