import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, reactive } from 'vue';

import { buyXorRunSteps, type BuyXorRunStep } from '@/features/misc/lib/buyXorCardPurchase';

const run = vi.hoisted(() => ({ state: null as any }));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  }),
}));
vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => ({ evmAddress: '0x1111111111111111111111111111111111111111' }),
}));
vi.mock('@/features/misc/components/buy-xor/TemporaryWalletPanel.vue', () => ({
  default: { name: 'TemporaryWalletPanel', template: '<div class="panel-stub" />' },
}));
vi.mock('@/features/misc/composables/useBuyXorCardRun', () => ({
  useBuyXorCardRun: (options: { onPreparing: (value: boolean) => void }) => {
    run.state.options = options;
    return {
      steps: computed(() => buyXorRunSteps(run.state.failure?.step ?? run.state.stage, !!run.state.failure)),
      stage: computed(() => run.state.stage),
      failure: computed(() => run.state.failure),
      busy: computed(() => ''),
      mode: computed(() => run.state.mode),
      persisted: computed(() => run.state.persisted),
      savedFunds: computed(() => run.state.savedFunds),
      swapAsset: computed(() => run.state.swapAsset),
      bridgeState: computed(() => ''),
      retry: run.state.retry,
      useSavedWallet: run.state.useSavedWallet,
      refresh: vi.fn(),
    };
  },
}));

const BuyXorCardRun = (await import('@/features/misc/components/buy-xor/BuyXorCardRun.vue')).default;

function mountRun() {
  return mount(BuyXorCardRun, {
    global: { stubs: { RouterLink: RouterLinkStub } },
    props: {
      enabled: true,
      conversionProgress: { state: 'idle' },
      bridgeProgress: { state: 'idle' },
      swapProgress: { state: 'idle' } as never,
      refreshConversion: vi.fn(),
      refreshBridge: vi.fn(),
    },
  });
}
const statuses = (wrapper: ReturnType<typeof mountRun>) =>
  wrapper.findAll('li').map((item) => `${item.attributes('data-step')}:${item.attributes('data-status')}`);

beforeEach(() => {
  run.state = reactive({
    stage: 'pay' as BuyXorRunStep | 'done',
    failure: null as null | { step: BuyXorRunStep; reason: string },
    mode: 'temporary' as 'temporary' | 'own' | null,
    persisted: true,
    savedFunds: null as null | { eth: bigint; dai: bigint },
    swapAsset: 'ETH' as 'ETH' | 'DAI',
    retry: vi.fn(),
    useSavedWallet: vi.fn(),
    options: null as any,
  });
});
afterEach(() => vi.clearAllMocks());

describe('BuyXorCardRun', () => {
  it('lists the five purchase steps with the current one marked and explained', async () => {
    run.state.stage = 'receive';
    const wrapper = mountRun();
    expect(statuses(wrapper)).toEqual(['pay:done', 'receive:active', 'send:todo', 'arrive:todo', 'swap:todo']);
    // MoonPay's ETH goes to SORA as it is: no swap to DAI on Ethereum.
    expect(wrapper.text()).toContain('buyXor.run.steps.send.title {"asset":"ETH"}');
    expect(wrapper.text()).toContain('buyXor.run.steps.swap.title {"asset":"ETH"}');
    expect(wrapper.get('[aria-current="step"]').text()).toContain('buyXor.run.steps.receive.title');
    // The wallet is saved in the browser, so the buyer may close the page while MoonPay works.
    expect(wrapper.get('[aria-current="step"]').text()).toContain('buyXor.run.steps.receive.detailSaved');
    expect(wrapper.text()).toContain('buyXor.run.temporaryMode');
    expect(wrapper.findAll('li p')).toHaveLength(1);
  });

  it('while waiting for MoonPay, links to the card orders and offers a new card payment', async () => {
    run.state.stage = 'receive';
    const wrapper = mountRun();
    const active = wrapper.get('[aria-current="step"]');
    expect(active.getComponent(RouterLinkStub).props('to')).toBe('/deposit/history');
    expect(active.text()).toContain('fiatPayment.historyBtn');
    await active.get('[data-test-name="buyXorRunRestart"]').trigger('click');
    expect(wrapper.emitted('restart')).toHaveLength(1);
    // Once the ETH has arrived, the purchase can no longer be restarted from the list.
    run.state.stage = 'send';
    await flushPromises();
    expect(wrapper.find('[data-test-name="buyXorRunRestart"]').exists()).toBe(false);
  });

  it('says who signs: the page for the temporary wallet, the buyer’s wallet otherwise', async () => {
    run.state.stage = 'send';
    const wrapper = mountRun();
    expect(wrapper.get('[aria-current="step"]').text()).toContain('buyXor.run.steps.send.detail');
    run.state.mode = 'own';
    await flushPromises();
    expect(wrapper.get('[aria-current="step"]').text()).toContain('buyXor.run.steps.send.detailOwn');
    expect(wrapper.text()).toContain('buyXor.run.ownMode');
    expect(wrapper.find('.buy-xor-run__wallet').exists()).toBe(false);
  });

  it('shows why a step stopped and runs it again on "Try again"', async () => {
    run.state.stage = 'send';
    run.state.failure = { step: 'send', reason: 'liquidity' };
    const wrapper = mountRun();
    expect(statuses(wrapper)).toContain('send:failed');
    expect(wrapper.get('[role="alert"]').text()).toContain('buyXor.run.failures.liquidity');
    await wrapper.get('[data-test-name="buyXorRunRetry"]').trigger('click');
    expect(run.state.retry).toHaveBeenCalledOnce();
  });

  it('opens the wallet section with restore when the saved purchase wallet cannot be opened', () => {
    run.state.mode = null;
    run.state.failure = { step: 'pay', reason: 'vault' };
    const wrapper = mountRun();
    expect(wrapper.get('[role="alert"]').text()).toContain('buyXor.run.failures.vault');
    expect(wrapper.get('.buy-xor-run__wallet').attributes('open')).toBeDefined();
    expect(wrapper.findComponent({ name: 'TemporaryWalletPanel' }).exists()).toBe(true);
    expect(wrapper.find('.buy-xor-run__wallet code').exists()).toBe(false);
  });

  it('offers to finish with an earlier temporary wallet that still holds funds', async () => {
    run.state.mode = 'own';
    run.state.savedFunds = { eth: 3_000_000_000_000_000n, dai: 0n };
    const wrapper = mountRun();
    expect(wrapper.text()).toContain('buyXor.run.savedFunds {"amount":"0.003 ETH"}');
    await wrapper.get('[data-test-name="buyXorRunUseSaved"]').trigger('click');
    expect(run.state.useSavedWallet).toHaveBeenCalledOnce();
  });

  it('holds the payment until the phrase is saved when the browser cannot keep the wallet', async () => {
    run.state.persisted = false;
    const wrapper = mountRun();
    expect(wrapper.emitted('ready')).toEqual([[false]]);
    expect(wrapper.get('.buy-xor-run__wallet').attributes('open')).toBeDefined();
    expect(wrapper.findComponent({ name: 'TemporaryWalletPanel' }).exists()).toBe(true);
    await wrapper.get('[data-test-name="buyXorRunSaved"]').setValue(true);
    expect(wrapper.emitted('ready')).toEqual([[false], [true]]);
  });

  it('reports a ready wallet at once when it is saved in the browser or is the buyer’s own', () => {
    expect(mountRun().emitted('ready')).toEqual([[true]]);
    run.state.mode = 'own';
    expect(mountRun().emitted('ready')).toEqual([[true]]);
  });

  it('names DAI in the steps when it finishes DAI left from the earlier DAI route', () => {
    run.state.stage = 'arrive';
    run.state.swapAsset = 'DAI';
    const wrapper = mountRun();
    expect(wrapper.get('[aria-current="step"]').text()).toContain('buyXor.run.steps.arrive.title {"asset":"DAI"}');
    expect(wrapper.text()).toContain('buyXor.run.steps.swap.title {"asset":"DAI"}');
  });

  it('tells the page when the ETH reaches SORA and when signing is under way', async () => {
    run.state.stage = 'arrive';
    const wrapper = mountRun();
    run.state.options.onPreparing(true);
    expect(wrapper.emitted('preparing')).toEqual([[true]]);
    run.state.stage = 'swap';
    await flushPromises();
    expect(wrapper.emitted('received')).toHaveLength(1);
    run.state.stage = 'done';
    await flushPromises();
    expect(wrapper.text()).toContain('buyXor.run.done');
    expect(wrapper.emitted('received')).toHaveLength(1);
  });

  it('does not report arrival again when a reload opens directly at the swap', async () => {
    run.state.stage = 'swap';
    const wrapper = mountRun();
    await flushPromises();
    expect(wrapper.emitted('received')).toBeUndefined();
  });
});
