import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { Operation } from '@sora-substrate/sdk';
import GetTsCardReadiness from '@/features/misc/components/burn/GetTsCardReadiness.vue';
import type { GetTsCardReadiness as Result } from '@/features/misc/lib/getTsCardReadiness';

const state = vi.hoisted(() => ({
  review: vi.fn(),
  provider: { getCode: vi.fn() },
  chain: {
    isConnected: true,
    genesisHash: { toString: () => '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5' },
  },
}));
const settings = reactive({
  nodeIsConnected: true,
  soraNetwork: 'mainnet',
  moonpayApiKey: 'pk_live_test',
  networkFees: { [Operation.Swap]: '10000000000000000', [Operation.BurnWithRemark]: '20000000000000000' },
  slippageTolerance: '0.5',
});
const wallet = reactive({ address: 'sora-account', isLoggedIn: true });
const web3 = reactive({
  evmAddress: '0x1111111111111111111111111111111111111111',
  evmProviderNetwork: 1,
  evmProvider: { uuid: 'provider-a' },
  ethBridgeEvmNetwork: 1,
  ethBridgeContractAddress: { OTHER: '0x313416870a4da6f12505a550b67bb73c8e21d5d3' },
});
vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      get api() {
        return state.chain;
      },
    },
  },
}));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settings }));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => wallet }));
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => web3 }));
vi.mock('@/utils/ethers-util', () => ({ default: { getEthersInstance: () => state.provider } }));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  }),
}));
vi.mock('@/features/misc/lib/getTsCardReadiness', () => ({
  GET_TS_CARD_DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  GET_TS_HASHI_DAI_BRIDGE: '0x313416870a4da6f12505a550b67bb73c8e21d5d3',
  requestGetTsCardReadiness: state.review,
}));
const ready = (): Result => ({
  allowed: true,
  amount: '25',
  expiresAt: Date.now() + 30000,
  deliveredEth: '0.01',
  existingEth: '1',
  conversionEth: '0.009454',
  ethereumGasReserve: '0.000396',
  conversionGasReserve: '0.0002',
  bridgeGasReserve: '0.000196',
  daiAmount: '24.75',
  spendableXor: '3.2',
  nativeFeeReserve: '0.01',
  conversionProviderFee: '0.00015',
  bridgeDaiFee: '0',
  providerFeeUsd: '4.5',
});
const exposed = (wrapper: ReturnType<typeof mount>) => wrapper.vm as unknown as { canContinue: () => boolean };
const last = (wrapper: ReturnType<typeof mount>) => wrapper.emitted('checked')?.at(-1)?.[0] as Result;

describe('wallet-bound card cost review UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    state.review.mockReset().mockImplementation(async () => ready());
    wallet.address = 'sora-account';
    wallet.isLoggedIn = true;
    web3.evmAddress = '0x1111111111111111111111111111111111111111';
    web3.evmProviderNetwork = 1;
    settings.slippageTolerance = '0.5';
    settings.nodeIsConnected = true;
    state.chain.isConnected = true;
  });
  afterEach(() => vi.useRealTimers());
  it('shows the budget, reserves and existing balance separately and exposes a fresh click-time guard', async () => {
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
    expect(last(wrapper).allowed).toBe(true);
    expect(exposed(wrapper).canContinue()).toBe(true);
    expect(wrapper.text()).toContain('getTs.cardReview.netXor');
    expect(wrapper.text()).toContain('getTs.cardReview.existing');
    expect(wrapper.text()).toContain('getTs.cardReview.nativeSwapFee');
    expect(wrapper.text()).not.toContain('getTs.cardReview.nativeTsFees');
    expect(state.review).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '25', account: web3.evmAddress, soraAccount: wallet.address }),
      expect.any(Object)
    );
    wrapper.unmount();
  });
  it('leads with net XOR and the budget, keeping intermediate costs and existing funds in closed details', async () => {
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25', purpose: 'xor' } });
    await vi.advanceTimersByTimeAsync(500);
    const summary = wrapper.get('.card-readiness__summary');
    expect(summary.text()).toContain('25 USD');
    expect(summary.text()).toContain('getTs.cardReview.netXor');
    expect(summary.get('.card-readiness__total').text()).toBe('≈ 3.2 XOR');
    expect(summary.text()).not.toContain('ETH');
    expect(summary.text()).not.toContain('DAI');
    expect(wrapper.get('.card-readiness__costs').text()).toContain('getTs.preview.remainingCosts');
    expect(wrapper.get('.card-readiness__costs').text()).toContain('getTs.cardReview.costsReserved');
    const details = wrapper.get('details');
    expect(details.attributes('open')).toBeUndefined();
    for (const key of ['delivery', 'reserved', 'provider', 'conversionGas', 'bridgeGas', 'nativeSwapFee', 'existing'])
      expect(details.text()).toContain(`getTs.cardReview.${key}`);
    expect(details.text()).toContain('getTs.cardReview.limits');
    expect(exposed(wrapper).canContinue()).toBe(true);
    wrapper.unmount();
  });
  it('labels TS output as available to burn and future claim without substituting spendable XOR', async () => {
    state.review.mockImplementation(async () => ({
      ...ready(),
      burnableXor: '3.18',
      estimatedTs: '159.999',
    }));
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25', purpose: 'ts' } });
    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.get('.card-readiness__total').text()).toBe('≈ 3.18 XOR');
    expect(wrapper.get('.card-readiness__summary').text()).toContain('getTs.cardReview.netBurnable');
    expect(wrapper.get('details').text()).toContain('getTs.cardReview.futureTs');
    expect(wrapper.get('details').text()).toContain('159.99 TS');
    expect(wrapper.text()).toContain('getTs.cardReview.nativeTsFees');
    expect(wrapper.text()).not.toContain('getTs.cardReview.netXor');
    expect(last(wrapper)).toMatchObject({ burnableXor: '3.18', estimatedTs: '159.999' });
    wrapper.unmount();
  });
  it('revokes immediately for amount, account, native fee and network changes', async () => {
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25' } });
    await vi.advanceTimersByTimeAsync(500);
    await wrapper.setProps({ amount: '30' });
    expect(last(wrapper).allowed).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    wallet.address = 'another-sora';
    expect(last(wrapper).allowed).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    settings.slippageTolerance = '1';
    expect(last(wrapper).allowed).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    web3.evmProviderNetwork = 2;
    expect(last(wrapper).allowed).toBe(false);
    wrapper.unmount();
  });
  it('rejects replacement provider objects at click time even when UUID and account strings stay the same', async () => {
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25' } });
    await vi.advanceTimersByTimeAsync(500);
    expect(exposed(wrapper).canContinue()).toBe(true);
    state.provider = { getCode: vi.fn() };
    expect(exposed(wrapper).canContinue()).toBe(false);
    wrapper.unmount();
  });
  it('rejects a disconnected or replaced SORA API at click time', async () => {
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25' } });
    await vi.advanceTimersByTimeAsync(500);
    state.chain.isConnected = false;
    expect(exposed(wrapper).canContinue()).toBe(false);
    state.chain.isConnected = true;
    state.chain = { ...state.chain };
    expect(exposed(wrapper).canContinue()).toBe(false);
    wrapper.unmount();
  });
  it('ignores a late ready response after budget edits or unmount', async () => {
    let finish!: (result: Result) => void;
    state.review.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25' } });
    await vi.advanceTimersByTimeAsync(500);
    await wrapper.setProps({ amount: '30' });
    finish(ready());
    await flushPromises();
    expect(last(wrapper).allowed).toBe(false);
    expect(exposed(wrapper).canContinue()).toBe(false);
    wrapper.unmount();
  });
  it('expires evidence while provider interaction is paused and does not refresh in the background', async () => {
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25' } });
    await vi.advanceTimersByTimeAsync(500);
    await wrapper.setProps({ paused: true });
    await vi.advanceTimersByTimeAsync(30001);
    expect(last(wrapper).allowed).toBe(false);
    expect(exposed(wrapper).canContinue()).toBe(false);
    expect(state.review).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('getTs.cardReview.errors.expired');
    wrapper.unmount();
  });
  it('gives a readable failure and explicit refresh without any checkout action', async () => {
    state.review.mockResolvedValue({ allowed: false, amount: '25', expiresAt: 0, reason: 'simulation' });
    const wrapper = mount(GetTsCardReadiness, { props: { amount: '25' } });
    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.text()).toContain('getTs.cardReview.errors.simulation');
    expect(exposed(wrapper).canContinue()).toBe(false);
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(state.review).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
