import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, reactive } from 'vue';

import { buyXorRunSteps, type BuyXorRunStep } from '@/features/misc/lib/buyXorCardPurchase';

const run = vi.hoisted(() => ({ state: null as any }));

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => ({ evmAddress: '0x1111111111111111111111111111111111111111' }),
}));
vi.mock('@/features/misc/components/buy-xor/TemporaryWalletPanel.vue', () => ({
  default: { name: 'TemporaryWalletPanel', template: '<div />' },
}));
vi.mock('@/features/misc/components/buy-xor/BuyXorJourneyArt.vue', () => ({
  default: { name: 'BuyXorJourneyArt', props: ['stage', 'failed'], template: '<div class="art-stub" />' },
}));
vi.mock('@/features/misc/composables/useBuyXorCardRun', () => ({
  useBuyXorCardRun: () => ({
    steps: computed(() => buyXorRunSteps(run.state.failure?.step ?? run.state.stage, !!run.state.failure)),
    stage: computed(() => run.state.stage),
    failure: computed(() => run.state.failure),
    busy: computed(() => ''),
    mode: computed(() => 'temporary'),
    persisted: computed(() => true),
    savedFunds: computed(() => null),
    swapAsset: computed(() => 'ETH'),
    bridgeState: computed(() => ''),
    retry: vi.fn(),
    useSavedWallet: vi.fn(),
    refresh: vi.fn(),
  }),
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
const fresh = (wrapper: ReturnType<typeof mountRun>) =>
  wrapper
    .findAll('li.is-fresh')
    .map((item) => item.attributes('data-step'))
    .sort();

beforeEach(() => {
  run.state = reactive({
    stage: 'receive' as BuyXorRunStep | 'done',
    failure: null as null | { step: BuyXorRunStep; reason: string },
  });
});
afterEach(() => vi.clearAllMocks());

describe('BuyXorCardRun motion', () => {
  it('opens with the water art, which shows the step the list shows', async () => {
    run.state.stage = 'send';
    const wrapper = mountRun();
    const art = wrapper.getComponent({ name: 'BuyXorJourneyArt' });
    // The art bleeds to the card's edge as its header: the first thing in the section, before the title.
    expect(wrapper.element.firstElementChild).toBe(art.element);
    expect(art.classes()).toContain('buy-xor-run__art');
    expect(art.props()).toEqual({ stage: 'send', failed: false });
    run.state.stage = 'arrive';
    await flushPromises();
    expect(art.props()).toEqual({ stage: 'arrive', failed: false });
    run.state.stage = 'done';
    await flushPromises();
    expect(art.props()).toEqual({ stage: 'done', failed: false });
  });

  it('shows a stopped step on the art as the step that stopped, not the stage reached', async () => {
    run.state.stage = 'arrive';
    run.state.failure = { step: 'send', reason: 'bridge' };
    const wrapper = mountRun();
    const art = wrapper.getComponent({ name: 'BuyXorJourneyArt' });
    expect(art.props()).toEqual({ stage: 'send', failed: true });
    expect(wrapper.get('[data-step="send"]').attributes('data-status')).toBe('failed');
    run.state.failure = null;
    await flushPromises();
    expect(art.props()).toEqual({ stage: 'arrive', failed: false });
  });

  it('pops only the steps that finish while the list is on screen', async () => {
    run.state.stage = 'send';
    const wrapper = mountRun();
    // Pay and receive were already done when the page opened (a reload mid-purchase): no pop for them.
    expect(wrapper.findAll('li[data-status="done"]')).toHaveLength(2);
    expect(fresh(wrapper)).toEqual([]);
    run.state.stage = 'arrive';
    await flushPromises();
    expect(fresh(wrapper)).toEqual(['send']);
    run.state.stage = 'swap';
    await flushPromises();
    expect(fresh(wrapper)).toEqual(['arrive', 'send']);
    run.state.stage = 'done';
    await flushPromises();
    expect(fresh(wrapper)).toEqual(['arrive', 'send', 'swap']);
  });

  it('clears the pop when a step is no longer done, for a new purchase', async () => {
    run.state.stage = 'receive';
    const wrapper = mountRun();
    run.state.stage = 'send';
    await flushPromises();
    expect(fresh(wrapper)).toEqual(['receive']);
    run.state.stage = 'pay';
    await flushPromises();
    expect(fresh(wrapper)).toEqual([]);
    run.state.stage = 'receive';
    await flushPromises();
    expect(fresh(wrapper)).toEqual(['pay']);
  });

  it('keeps the list readable: five numbered steps, one marked current', () => {
    run.state.stage = 'swap';
    const wrapper = mountRun();
    expect(wrapper.findAll('ol > li')).toHaveLength(5);
    expect(wrapper.findAll('[aria-current="step"]')).toHaveLength(1);
    expect(wrapper.get('[aria-current="step"]').attributes('data-step')).toBe('swap');
  });
});
