import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import GetTsPage from '@/features/misc/pages/GetTsPage.vue';
import { SoraNetwork } from '@/consts';
import { emptyGetTsPlan, parseGetTsPlan, patchGetTsPlan } from '@/features/misc/lib/getTsPlan';

const shared = vi.hoisted(() => ({ ctx: null as ReturnType<typeof createContext> | null }));
function createContext() {
  const route = reactive({ query: {} as Record<string, string> });
  const plan = ref(emptyGetTsPlan());
  return {
    route,
    plan,
    router: {
      replace: vi.fn(async (value: { query: Record<string, string> }) => {
        route.query = value.query;
      }),
      push: vi.fn(),
    },
    internal: {
      isLoggedIn: ref(true),
      soraAddress: ref('cnSoraAccount'),
      isSoraAccountDialogVisible: ref(false),
      connectSoraWallet: vi.fn(),
    },
    external: { evmAddress: ref('0x1111111111111111111111111111111111111111') },
    ton: { address: ref(''), chain: ref('') },
    bridgeProgress: ref({ state: 'idle' }),
    swapProgress: ref({ state: 'idle' }),
    conversionProgress: ref<{ state: string; reference?: string; amount?: string }>({ state: 'idle' }),
    funnel: {
      consent: ref(false),
      privacyBlocked: ref(false),
      delivery: ref('disabled'),
      setConsent: vi.fn(),
      record: vi.fn(async () => {}),
    },
    cardReady: vi.fn(() => true),
    leaveGuard: undefined as (() => boolean) | undefined,
    refresh: vi.fn(),
    track: vi.fn(),
    wallet: reactive({
      accountAssetsLoaded: true,
      accountAssetsLoading: false,
      accountAssetsAddressTable: {} as Record<string, { balance: { transferable: string } }>,
    }),
    settings: reactive({
      soraNetwork: SoraNetwork.Prod,
      moonpayEnabled: true,
      networkFees: { BurnWithRemark: '1000000000000000' },
    }),
    moonpay: { setDialogVisibility: vi.fn() },
    swap: {
      setFromValue: vi.fn(),
      setToValue: vi.fn(),
      setExchangeB: vi.fn(),
      selectDexId: vi.fn(),
      setLiquiditySource: vi.fn(),
      setTokenFromAddress: vi.fn(),
      setTokenToAddress: vi.fn(),
    },
    copy: vi.fn(),
  };
}
vi.mock('@/features/misc/composables/useBuyXorFunnel', () => ({ useBuyXorFunnel: () => shared.ctx!.funnel }));
vi.mock('vue-router', () => ({
  useRoute: () => shared.ctx!.route,
  useRouter: () => shared.ctx!.router,
  onBeforeRouteLeave: (guard: () => boolean) => {
    shared.ctx!.leaveGuard = guard;
  },
}));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/composables/useCopyAddress', () => ({ useCopyAddress: () => ({ handleCopyAddress: shared.ctx!.copy }) }));
vi.mock('@/composables/useInternalConnect', () => ({ useInternalConnect: () => shared.ctx!.internal }));
vi.mock('@/composables/useWeb3Connection', () => ({ useWeb3Connection: () => shared.ctx!.external }));
vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({ withApi: async (action: () => unknown) => action() }),
}));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => shared.ctx!.wallet }));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => shared.ctx!.settings }));
vi.mock('@/stores/moonpay', () => ({ useMoonpayStore: () => shared.ctx!.moonpay }));
vi.mock('@/features/swap/stores/useSwapStore', () => ({ useSwapStore: () => shared.ctx!.swap }));
vi.mock('@/features/misc/composables/useTonswapTonWallet', () => ({ useTonswapTonWallet: () => shared.ctx!.ton }));
vi.mock('@/features/misc/composables/useGetTsPlan', () => ({
  useGetTsPlan: () => ({
    plan: shared.ctx!.plan,
    updatePlan: (patch: Parameters<typeof patchGetTsPlan>[1]) => {
      const next = patchGetTsPlan(shared.ctx!.plan.value, patch);
      if (next) shared.ctx!.plan.value = next;
      return !!next;
    },
    trackTransaction: shared.ctx!.track,
    rememberCardDraft: (cardDraft: { deliveredEth: string; conversionEth: string }) => {
      const next = parseGetTsPlan({ ...shared.ctx!.plan.value, cardDraft });
      if (next) shared.ctx!.plan.value = next;
      return !!next;
    },
    forgetCardDraft: () => {
      const next = { ...shared.ctx!.plan.value };
      delete next.cardDraft;
      shared.ctx!.plan.value = next;
    },
  }),
}));
vi.mock('@/features/misc/composables/useGetTsBridgeProgress', () => ({
  useGetTsBridgeProgress: () => ({ progress: shared.ctx!.bridgeProgress, refresh: shared.ctx!.refresh }),
}));
vi.mock('@/features/misc/composables/useGetTsSwapProgress', () => ({
  useGetTsSwapProgress: () => ({ progress: shared.ctx!.swapProgress, refresh: shared.ctx!.refresh }),
}));
vi.mock('@/features/misc/composables/useGetTsConversionProgress', () => ({
  useGetTsConversionProgress: () => ({ progress: shared.ctx!.conversionProgress, refresh: shared.ctx!.refresh }),
}));
vi.mock('@/components/shared/Dialog/SelectProvider.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/features/deposit/components/moonpay/Moonpay.vue', () => ({
  default: {
    name: 'Moonpay',
    props: ['currencyCode', 'autoPrepareBridge', 'baseCurrencyAmount', 'receivingAddress'],
    emits: ['completed'],
    template: '<div />',
  },
}));
vi.mock('@/features/deposit/components/moonpay/Notification.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/features/deposit/components/moonpay/Confirmation.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/features/misc/components/burn/TonswapBurnCampaign.vue', () => ({
  default: { name: 'TonswapBurnCampaign', props: ['initialAmount'], emits: ['submitted'], template: '<div />' },
}));
vi.mock('@/features/misc/components/burn/TonswapConversionPanel.vue', () => ({
  default: {
    name: 'TonswapConversionPanel',
    props: ['source', 'paymentAsset', 'paymentAmount', 'daiIntent', 'purpose', 'ethBudget'],
    emits: ['preparing', 'submitted', 'completed', 'update:paymentAmount', 'update:paymentAsset', 'phase-change'],
    template: '<div />',
  },
}));
vi.mock('@/features/misc/components/burn/GetTsCardReadiness.vue', () => ({
  default: {
    name: 'GetTsCardReadiness',
    props: ['amount', 'paused', 'purpose'],
    setup: () => ({ canContinue: shared.ctx!.cardReady }),
    emits: ['checked'],
    template: '<div />',
  },
}));
vi.mock('@/features/misc/components/burn/GetTsWalletSetup.vue', () => ({
  default: { name: 'GetTsWalletSetup', props: ['source', 'purpose'], template: '<div />' },
}));
vi.mock('@/features/misc/components/burn/GetTsPlanPreview.vue', () => ({
  default: {
    name: 'GetTsPlanPreview',
    props: ['source', 'amount', 'paymentAsset', 'purpose'],
    emits: ['preview', 'update:amount', 'update:paymentAsset'],
    template: '<div />',
  },
}));
vi.mock('@/features/misc/components/buy-xor/BuyXorQuickStart.vue', () => ({
  default: {
    name: 'BuyXorQuickStart',
    props: ['source', 'amount', 'paymentAsset', 'canContinue', 'locked'],
    emits: ['selectSource', 'update:amount', 'update:paymentAsset', 'preview', 'continue'],
    setup: () => ({ focus: vi.fn() }),
    template: '<div />',
  },
}));
vi.mock('@/features/misc/components/burn/GetTsConversionRecovery.vue', () => ({
  default: {
    name: 'GetTsConversionRecovery',
    props: ['reference', 'purpose'],
    emits: ['verified'],
    template: '<div />',
  },
}));
vi.mock('@/features/swap/components/widgets/Form.vue', () => ({
  default: {
    name: 'SwapFormWidget',
    props: ['fixedPair', 'maxPriceImpact', 'compactDetails', 'purchasePurpose'],
    emits: ['submitted', 'preparing'],
    template: '<div />',
  },
}));
const wrappers: ReturnType<typeof mount>[] = [];
function mountPage(props: { purpose?: 'ts' | 'xor' } = {}) {
  const wrapper = mount(GetTsPage, {
    props,
    global: {
      stubs: {
        SButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function button(wrapper: ReturnType<typeof mountPage>, text: string) {
  return wrapper.findAll('button').find((value) => value.text() === text)!;
}
function setup(source = 'ethereum', step = 'source') {
  shared.ctx!.route.query = { source, step };
  shared.ctx!.plan.value = {
    version: 1,
    paymentAsset:
      source === 'card'
        ? 'card'
        : source === 'ton'
          ? 'usdt-ton'
          : source === 'sora'
            ? 'dai-sora'
            : source === 'xor'
              ? 'xor-sora'
              : 'eth',
    paymentAmount: source === 'card' ? '100' : source === 'ethereum' ? '0.01' : '10',
    daiAmount: '10',
    xorAmount: '2',
    references: {},
  };
}
function quote(wrapper: ReturnType<typeof mountPage>, expiresAt = Date.now() + 30_000) {
  wrapper.findComponent({ name: 'GetTsCardReadiness' }).vm.$emit('checked', {
    allowed: true,
    amount: '100',
    deliveredEth: '0.02',
    conversionEth: '0.017',
    daiAmount: '9',
    spendableXor: '1.5',
    burnableXor: '1.4',
    expiresAt,
  });
}

describe('Get TS checkout', () => {
  beforeEach(() => {
    shared.ctx = createContext();
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    wrappers.splice(0).forEach((w) => w.unmount());
    vi.useRealTimers();
  });
  it.each(['ts', 'xor'] as const)(
    'restores a neutral %s card continuation after handoff and reload',
    async (purpose) => {
      setup('card', 'fund');
      const first = mountPage({ purpose });
      quote(first);
      await flushPromises();
      await first.get('[data-test-name="getTsBuyCard"]').trigger('click');
      expect(shared.ctx!.plan.value.cardDraft).toEqual({ deliveredEth: '0.02', conversionEth: '0.017' });
      expect(shared.ctx!.moonpay.setDialogVisibility).toHaveBeenCalledExactlyOnceWith(true);
      expect(first.find('[data-test-name="getTsBuyCard"]').exists()).toBe(false);
      expect(first.text()).toContain('getTs.cardResumeDescription');
      first.unmount();
      shared.ctx!.moonpay.setDialogVisibility.mockClear();
      const restored = mountPage({ purpose });
      expect(restored.find('[data-test-name="getTsBuyCard"]').exists()).toBe(false);
      expect(restored.text()).toContain('getTs.cardResumeDescription');
      expect(restored.text()).not.toContain('getTs.cardCompleted');
      expect(restored.findComponent({ name: 'TonswapConversionPanel' }).props()).toMatchObject({
        paymentAmount: '0.017',
        ethBudget: '0.02',
        source: 'ethereum',
      });
      expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
      expect(shared.ctx!.track).not.toHaveBeenCalled();
      await button(restored, 'getTs.cardReviewAgain').trigger('click');
      expect(shared.ctx!.plan.value.cardDraft).toBeUndefined();
      expect(restored.findComponent({ name: 'GetTsCardReadiness' }).exists()).toBe(true);
      expect(restored.get('[data-test-name="getTsBuyCard"]').attributes('disabled')).toBeDefined();
      expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
    }
  );
  it('does not persist a provider-completed claim across a card continuation reload', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.cardDraft = { deliveredEth: '0.02', conversionEth: '0.017' };
    const first = mountPage();
    first.findComponent({ name: 'Moonpay' }).vm.$emit('completed', {});
    await flushPromises();
    expect(first.text()).toContain('getTs.cardCompleted');
    first.unmount();
    const restored = mountPage();
    expect(restored.text()).not.toContain('getTs.cardCompleted');
    expect(restored.text()).toContain('getTs.cardResumeDescription');
  });
  it('restores ETH units for a new card purchase after manually choosing USDT conversion', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.cardDraft = { deliveredEth: '0.02', conversionEth: '0.017' };
    const w = mountPage();
    w.findComponent({ name: 'TonswapConversionPanel' }).vm.$emit('update:paymentAsset', 'usdt-ethereum');
    w.findComponent({ name: 'TonswapConversionPanel' }).vm.$emit('update:paymentAmount', '20');
    await flushPromises();
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).props('paymentAsset')).toBe('usdt-ethereum');
    await button(w, 'getTs.cardReviewAgain').trigger('click');
    quote(w);
    await flushPromises();
    await w.get('[data-test-name="getTsBuyCard"]').trigger('click');
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).props()).toMatchObject({
      paymentAsset: 'eth',
      paymentAmount: '0.017',
      ethBudget: '0.02',
    });
    expect(w.findComponent({ name: 'Moonpay' }).props('receivingAddress')).toBe(shared.ctx!.external.evmAddress.value);
  });
  it('cannot discard a card continuation while its conversion wallet request is pending', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.cardDraft = { deliveredEth: '0.02', conversionEth: '0.017' };
    const w = mountPage();
    w.findComponent({ name: 'TonswapConversionPanel' }).vm.$emit('preparing', true);
    await flushPromises();
    expect(button(w, 'getTs.cardReviewAgain').attributes('disabled')).toBeDefined();
    await button(w, 'getTs.cardReviewAgain').trigger('click');
    expect(shared.ctx!.plan.value.cardDraft).toBeDefined();
    expect(w.find('[data-test-name="getTsBuyCard"]').exists()).toBe(false);
  });
  it.each(['ts', 'xor'] as const)(
    'preserves a pending %s plan across amount/source edits and changed deep links',
    async (purpose) => {
      setup('ethereum', 'source');
      const hash = '0x' + 'a'.repeat(64);
      shared.ctx!.plan.value.references.conversion = hash;
      shared.ctx!.conversionProgress.value = { state: 'pending', reference: hash };
      const before = JSON.stringify(shared.ctx!.plan.value);
      const w = mountPage({ purpose });
      expect(w.findComponent({ name: 'GetTsPlanPreview' }).exists()).toBe(false);
      if (purpose === 'xor') {
        const start = w.getComponent({ name: 'BuyXorQuickStart' });
        expect(start.props()).toMatchObject({ locked: true, source: 'ethereum', amount: '0.01' });
        start.vm.$emit('selectSource', 'card');
        start.vm.$emit('update:amount', '0.5');
        start.vm.$emit('update:paymentAsset', 'USDT');
        await flushPromises();
      } else {
        expect(w.get('[data-source="card"]').attributes('disabled')).toBeDefined();
        await w.get('[data-source="card"]').trigger('click');
      }
      expect(JSON.stringify(shared.ctx!.plan.value)).toBe(before);
      shared.ctx!.route.query = { source: 'card', step: 'fund' };
      await flushPromises();
      expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('fund');
      expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
      expect(w.find('[data-test-name="getTsBuyCard"]').exists()).toBe(false);
      expect(JSON.stringify(shared.ctx!.plan.value)).toBe(before);
      expect(w.get('[data-test-name="protectedPurchase"]').text()).toContain(
        purpose === 'xor' ? 'buyXor.resumeTitle' : 'getTs.resumeTitle'
      );
    }
  );
  it('restores the tracked source before its immediate watcher can clear a deep-linked purchase', () => {
    setup('ethereum', 'source');
    shared.ctx!.plan.value.references.bridge = '0x' + 'a'.repeat(64);
    shared.ctx!.route.query = { source: 'card', step: 'fund' };
    const w = mountPage();
    expect(shared.ctx!.plan.value.paymentAsset).toBe('eth');
    expect(shared.ctx!.plan.value.references.bridge).toBeDefined();
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
  });
  it('resumes a protected plan through wallet setup when disconnected', async () => {
    setup('ethereum', 'source');
    shared.ctx!.internal.isLoggedIn.value = false;
    shared.ctx!.plan.value.references.conversion = '0x' + 'a'.repeat(64);
    const w = mountPage();
    await w.get('[data-test-name="protectedPurchase"] button').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('wallets');
    shared.ctx!.internal.isLoggedIn.value = true;
    await flushPromises();
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('fund');
  });
  it.each(['conversion', 'swap'] as const)(
    'pins the %s signing child before a hash through edits, links and disconnects',
    async (stage) => {
      setup(stage === 'swap' ? 'sora' : 'ethereum', stage === 'swap' ? 'swap' : 'fund');
      const w = mountPage();
      await flushPromises();
      const childName = stage === 'swap' ? 'SwapFormWidget' : 'TonswapConversionPanel';
      const child = w.getComponent({ name: childName });
      child.vm.$emit('preparing', true);
      await flushPromises();
      await w.findAll('.get-ts__phases button')[0].trigger('click');
      if (stage === 'conversion') child.vm.$emit('update:paymentAmount', '0.03');
      shared.ctx!.internal.isLoggedIn.value = false;
      shared.ctx!.external.evmAddress.value = '';
      shared.ctx!.route.query = { source: 'card', step: 'source' };
      await flushPromises();
      expect(w.getComponent({ name: childName }).vm).toBe(child.vm);
      expect(shared.ctx!.plan.value.paymentAmount).toBe(stage === 'swap' ? '10' : '0.01');
      expect(w.get('.get-ts__workspace').attributes('data-step')).toBe(stage === 'swap' ? 'swap' : 'fund');
      child.vm.$emit('preparing', false);
      await flushPromises();
      expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('wallets');
    }
  );
  it('blocks upstream card and failed-conversion actions after a bridge was reviewed', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.bridgeDraft = { id: 'reviewed', amount: '10', contextHash: '0x' + 'd'.repeat(64) };
    const w = mountPage();
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
    expect(w.find('[data-test-name="getTsBuyCard"]').exists()).toBe(false);
    shared.ctx!.plan.value.references.conversion = '0x' + 'a'.repeat(64);
    shared.ctx!.conversionProgress.value = { state: 'failed', reference: shared.ctx!.plan.value.references.conversion };
    shared.ctx!.route.query = { source: 'card', step: 'fund' };
    await flushPromises();
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
    expect(shared.ctx!.plan.value.bridgeDraft).toBeDefined();
  });
  it('keeps a failed-conversion retry mounted through a wallet change and releases preparation after tracking its new hash', async () => {
    setup('ethereum', 'fund');
    const original = '0x' + 'a'.repeat(64);
    const submitted = '0x' + 'b'.repeat(64);
    shared.ctx!.plan.value.references.conversion = original;
    shared.ctx!.conversionProgress.value = { state: 'failed', reference: original };
    shared.ctx!.track.mockImplementation((_stage, hash) => {
      shared.ctx!.plan.value.references.conversion = hash;
      return true;
    });
    const w = mountPage();
    await button(w, 'getTs.retry').trigger('click');
    const panel = w.getComponent({ name: 'TonswapConversionPanel' });
    panel.vm.$emit('preparing', true);
    shared.ctx!.external.evmAddress.value = '0x2222222222222222222222222222222222222222';
    await flushPromises();
    expect(w.getComponent({ name: 'TonswapConversionPanel' }).vm).toBe(panel.vm);
    panel.vm.$emit('submitted', { transactionHash: submitted });
    await flushPromises();
    expect(shared.ctx!.plan.value.references.conversion).toBe(submitted);
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
    // The removed child never emits preparing=false; the parent must release it itself.
    await w.findAll('.get-ts__phases button')[0].trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('source');
    expect(w.findComponent({ name: 'GetTsPlanPreview' }).exists()).toBe(false);
    shared.ctx!.conversionProgress.value = { state: 'failed', reference: submitted };
    await flushPromises();
    expect(w.findComponent({ name: 'GetTsPlanPreview' }).exists()).toBe(true);
  });
  it('allows explicit edits only after matching terminal funding evidence and does not lock completed burns', async () => {
    setup('ethereum', 'source');
    const hash = '0x' + 'a'.repeat(64);
    shared.ctx!.plan.value.references.conversion = hash;
    shared.ctx!.conversionProgress.value = { state: 'received', reference: hash, amount: '10' };
    const w = mountPage();
    expect(w.find('[data-test-name="protectedPurchase"]').exists()).toBe(false);
    w.getComponent({ name: 'GetTsPlanPreview' }).vm.$emit('update:amount', '0.02');
    await flushPromises();
    expect(shared.ctx!.plan.value.references).toEqual({});
    shared.ctx!.plan.value.references.burn = hash;
    await flushPromises();
    expect(w.findComponent({ name: 'GetTsPlanPreview' }).exists()).toBe(true);
  });
  it.each(['conversion', 'swap'] as const)(
    'keeps the %s signing component mounted until reference handoff',
    async (stage) => {
      setup(stage === 'swap' ? 'sora' : 'ethereum', stage === 'swap' ? 'swap' : 'fund');
      const w = mountPage({ purpose: 'xor' });
      await flushPromises();
      const component = w.findComponent({ name: stage === 'swap' ? 'SwapFormWidget' : 'TonswapConversionPanel' });
      expect(shared.ctx!.leaveGuard?.()).toBe(true);
      component.vm.$emit('preparing', true);
      await flushPromises();
      expect(shared.ctx!.leaveGuard?.()).toBe(false);
      expect(component.exists()).toBe(true);
      component.vm.$emit('preparing', false);
      await flushPromises();
      expect(shared.ctx!.leaveGuard?.()).toBe(true);
    }
  );
  it('keeps exact transaction evidence and recovery in one purchase overview', async () => {
    setup('ethereum', 'fund');
    const hash = `0x${'1'.repeat(64)}`;
    shared.ctx!.plan.value.references.conversion = hash;
    shared.ctx!.conversionProgress.value = { state: 'received', reference: hash, amount: '10' };
    const w = mountPage({ purpose: 'xor' });
    const progress = () => w.get('[data-test-name="purchaseProgress"]');
    expect(w.text()).toContain('getTs.journey.purchase');
    expect(w.text()).not.toContain('getTs.phases.actions');
    expect(progress().get('[data-stage="conversion"]').attributes('data-status')).toBe('confirmed');
    shared.ctx!.conversionProgress.value = { state: 'received', reference: `0x${'2'.repeat(64)}` };
    await flushPromises();
    expect(progress().get('[data-stage="conversion"]').attributes('data-status')).toBe('unavailable');
    shared.ctx!.refresh.mockClear();
    await button(w, 'getTs.journey.checkAll').trigger('click');
    await flushPromises();
    expect(shared.ctx!.refresh).toHaveBeenCalledTimes(3);
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
    expect(shared.ctx!.track).not.toHaveBeenCalled();
  });
  it('keeps SORA receipt confirmation after disconnecting the upstream Ethereum wallet', async () => {
    setup('card', 'swap');
    const hash = `0x${'1'.repeat(64)}`;
    shared.ctx!.plan.value.references.swap = hash;
    shared.ctx!.swapProgress.value = { state: 'received', reference: hash } as { state: string };
    const w = mountPage({ purpose: 'xor' });
    await flushPromises();
    shared.ctx!.external.evmAddress.value = '';
    await flushPromises();
    expect(w.get('[data-stage="swap"]').attributes('data-status')).toBe('confirmed');
    expect(w.text()).toContain('buyXor.receivedTitle');
  });
  it('accepts a TON alternative only when the plan has no unresolved transaction', async () => {
    setup('ton', 'source');
    const w = mountPage();
    const requirements = () => w.findComponent({ name: 'GetTsRouteRequirements' });
    requirements().vm.$emit('selectSource', 'card');
    await flushPromises();
    expect(shared.ctx!.route.query.source).toBe('card');
    expect(shared.ctx!.plan.value.paymentAmount).toBe('');
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
    w.unmount();
    setup('ton', 'source');
    shared.ctx!.plan.value.references.conversion = `0x${'1'.repeat(64)}`;
    const protectedPage = mountPage();
    protectedPage.findComponent({ name: 'GetTsRouteRequirements' }).vm.$emit('selectSource', 'card');
    await flushPromises();
    expect(shared.ctx!.route.query.source).toBe('ton');
    expect(shared.ctx!.plan.value.references.conversion).toBeTruthy();
  });
  it('starts with payment and amount, keeps three stable phases, and opens no wallet or payment', async () => {
    shared.ctx!.internal.isLoggedIn.value = false;
    const w = mountPage();
    expect(w.findAll('.get-ts__phases button')).toHaveLength(3);
    await w.get('[data-source="card"]').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('source');
    expect(w.findComponent({ name: 'GetTsPlanPreview' }).props('paymentAsset')).toBe('USD');
    expect(button(w, 'getTs.continuePlan').attributes('disabled')).toBeDefined();
    expect(shared.ctx!.internal.connectSoraWallet).not.toHaveBeenCalled();
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
    expect(w.text()).not.toContain('getTs.balancesTitle');
  });
  it('carries a feasible exact plan through wallet setup and revokes invalid or blocked amounts', async () => {
    setup();
    const w = mountPage();
    const preview = w.findComponent({ name: 'GetTsPlanPreview' });
    preview.vm.$emit('preview', {
      state: 'ready',
      feasible: true,
      source: 'ethereum',
      paymentAsset: 'ETH',
      amount: '0.01',
      daiIntent: '12.123456789123456789',
      burnableXor: '2.5',
      estimatedTs: '123.45',
      expiresAt: Date.now() + 30_000,
    });
    await flushPromises();
    expect(shared.ctx!.plan.value.daiAmount).toBe('12.123456789123456789');
    await button(w, 'getTs.continuePlan').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('wallets');
    expect(w.findComponent({ name: 'GetTsWalletSetup' }).props('source')).toBe('ethereum');
    await button(w, 'getTs.editPlan').trigger('click');
    w.findComponent({ name: 'GetTsPlanPreview' }).vm.$emit('update:amount', '-1');
    await flushPromises();
    expect(shared.ctx!.plan.value.paymentAmount).toBe('');
    expect(button(w, 'getTs.continuePlan').attributes('disabled')).toBeDefined();
    w.findComponent({ name: 'GetTsPlanPreview' }).vm.$emit('update:amount', '1');
    await flushPromises();
    w.findComponent({ name: 'GetTsPlanPreview' }).vm.$emit('preview', {
      state: 'blocked',
      feasible: false,
      source: 'ethereum',
      paymentAsset: 'ETH',
      amount: '1',
    });
    await flushPromises();
    expect(button(w, 'getTs.continuePlan').attributes('disabled')).toBeDefined();
    expect(w.findAll('.get-ts__phases button')[1].attributes('disabled')).toBeDefined();
  });
  it('sends empty deep links back to planning and does not connect anything', () => {
    shared.ctx!.route.query = { source: 'card', step: 'fund' };
    const w = mountPage();
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('source');
    expect(shared.ctx!.internal.connectSoraWallet).not.toHaveBeenCalled();
  });
  it('keeps a reviewed smaller bridge draft when revisiting the original plan and resumes it after wallets', async () => {
    setup('ethereum', 'source');
    shared.ctx!.plan.value.daiAmount = '5';
    const draft = { id: 'reviewed-bridge-row', amount: '5', contextHash: '0x' + 'd'.repeat(64) };
    shared.ctx!.plan.value.bridgeDraft = draft;
    const w = mountPage();
    expect(w.findComponent({ name: 'GetTsPlanPreview' }).exists()).toBe(false);
    await flushPromises();
    expect(shared.ctx!.plan.value.daiAmount).toBe('5');
    expect(shared.ctx!.plan.value.bridgeDraft).toEqual(draft);
    await w.findAll('.get-ts__phases button')[1].trigger('click');
    await button(w, 'getTs.walletsContinue').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
    expect(button(w, 'getTs.openBridge')).toBeUndefined();
    await button(w, 'getTs.bridgeHistory').trigger('click');
    expect(shared.ctx!.router.push).toHaveBeenCalledWith({
      path: '/bridge/history',
      query: { campaign: 'tonswap', getTs: '1', asset: 'DAI' },
    });
  });
  it('requires the TON spending wallet as well as Ethereum and SORA before continuing', async () => {
    setup('ton', 'wallets');
    const w = mountPage();
    expect(button(w, 'getTs.walletsContinue')).toBeUndefined();
    shared.ctx!.ton.address.value = 'ton-address';
    shared.ctx!.ton.chain.value = '-239';
    await flushPromises();
    expect(button(w, 'getTs.walletsContinue')).toBeDefined();
    shared.ctx!.ton.chain.value = '-3';
    await flushPromises();
    expect(button(w, 'getTs.walletsContinue')).toBeUndefined();
  });
  it('uses one fresh matching card check, carries the USD budget and rechecks expiration at click time', async () => {
    setup('card', 'fund');
    const w = mountPage();
    const buy = w.get('[data-test-name="getTsBuyCard"]');
    expect(buy.attributes('disabled')).toBeDefined();
    expect(w.findComponent({ name: 'Moonpay' }).props()).toMatchObject({
      currencyCode: 'eth',
      autoPrepareBridge: false,
      baseCurrencyAmount: '100',
    });
    quote(w);
    await flushPromises();
    expect(buy.attributes('disabled')).toBeUndefined();
    await buy.trigger('click');
    expect(shared.ctx!.moonpay.setDialogVisibility).toHaveBeenCalledWith(true);
    shared.ctx!.moonpay.setDialogVisibility.mockClear();
    vi.setSystemTime(Date.now() + 30_001);
    await buy.trigger('click');
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
  });
  it('reveals conversion only after card completion or an explicit existing-ETH action', async () => {
    setup('card', 'fund');
    const w = mountPage();
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
    w.findComponent({ name: 'Moonpay' }).vm.$emit('completed', {});
    await flushPromises();
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(true);
    expect(w.text()).toContain('getTs.cardCompleted');
    expect(shared.ctx!.router.push).not.toHaveBeenCalled();
  });
  it('records only confirmed conversion output and clears old completion when the budget changes', async () => {
    setup('ethereum', 'fund');
    const w = mountPage();
    const hash = '0x' + 'a'.repeat(64);
    w.findComponent({ name: 'TonswapConversionPanel' }).vm.$emit('completed', {
      receivedAsset: 'DAI',
      amount: '9.123',
      transactionHash: hash,
    });
    await flushPromises();
    expect(shared.ctx!.plan.value.daiAmount).toBe('9.123');
    expect(shared.ctx!.track).toHaveBeenCalledWith('conversion', hash);
    expect(w.text()).toContain('getTs.conversionConfirmed');
    await button(w, 'getTs.editPlan').trigger('click');
    w.findComponent({ name: 'GetTsPlanPreview' }).vm.$emit('update:amount', '0.02');
    await flushPromises();
    await button(w, 'getTs.continuePlan').trigger('click');
    await button(w, 'getTs.walletsContinue').trigger('click');
    await flushPromises();
    expect(w.text()).not.toContain('getTs.conversionConfirmed');
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).props('paymentAmount')).toBe('0.02');
  });
  it('keeps original TON-USDT amount separate from later Ethereum conversion input', async () => {
    setup('ton', 'fund');
    shared.ctx!.ton.address.value = 'ton-address';
    shared.ctx!.ton.chain.value = '-239';
    const w = mountPage();
    const panel = w.findComponent({ name: 'TonswapConversionPanel' });
    panel.vm.$emit('update:paymentAmount', '12');
    await flushPromises();
    expect(shared.ctx!.plan.value.paymentAmount).toBe('12');
    panel.vm.$emit('phase-change', 'ethereum');
    panel.vm.$emit('update:paymentAmount', '0.002');
    await flushPromises();
    expect(shared.ctx!.plan.value.paymentAmount).toBe('12');
    expect(panel.props('paymentAmount')).toBe('0.002');
  });
  it('prefills the planned DAI swap without signing and carries the suggested burn amount', async () => {
    setup('sora', 'swap');
    const w = mountPage();
    await flushPromises();
    expect(shared.ctx!.swap.setFromValue).toHaveBeenLastCalledWith('10');
    expect(w.findComponent({ name: 'SwapFormWidget' }).props()).toMatchObject({
      fixedPair: '',
      maxPriceImpact: '5',
      compactDetails: '',
    });
    expect(shared.ctx!.router.push).not.toHaveBeenCalled();
  });
  it('opens only the tagged DAI bridge and uses verified bridge status separately from balances', async () => {
    setup('ethereum', 'bridge');
    const w = mountPage();
    await button(w, 'getTs.openBridge').trigger('click');
    expect(shared.ctx!.router.push).toHaveBeenCalledWith({
      path: '/bridge',
      query: { campaign: 'tonswap', getTs: '1', asset: 'DAI' },
    });
    shared.ctx!.wallet.accountAssetsAddressTable[DAI.address] = { balance: { transferable: '10000000000000000000' } };
    await flushPromises();
    expect(button(w, 'getTs.continueSwap')).toBeUndefined();
    shared.ctx!.bridgeProgress.value = { state: 'received' };
    await flushPromises();
    expect(button(w, 'getTs.continueSwap')).toBeDefined();
  });
  it('keeps the signing form mounted while a swap draft is saved, then recovers without a duplicate form', async () => {
    setup('sora', 'swap');
    const w = mountPage({ purpose: 'xor' });
    await flushPromises();
    const form = w.getComponent({ name: 'SwapFormWidget' });
    expect(form.props('purchasePurpose')).toBe('xor');
    form.vm.$emit('preparing', true);
    shared.ctx!.plan.value.swapDraft = {
      id: 'purchase-swap:xor:123e4567-e89b-42d3-a456-426614174000',
      amount: '10',
      contextHash: '0x' + 'd'.repeat(64),
    };
    await flushPromises();
    expect(w.findComponent({ name: 'SwapFormWidget' }).exists()).toBe(true);
    expect(w.text()).not.toContain('getTs.swapSubmitted');
    form.vm.$emit('preparing', false);
    await flushPromises();
    expect(w.findComponent({ name: 'SwapFormWidget' }).exists()).toBe(false);
    expect(w.text()).toContain('getTs.swapProgress.unavailable');
    shared.ctx!.route.query.step = 'wallets';
    await flushPromises();
    await button(w, 'getTs.walletsContinue').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('swap');
    expect(w.findComponent({ name: 'SwapFormWidget' }).exists()).toBe(false);
  });

  it('keeps partial conversion input editable without jumping back to planning', async () => {
    setup('ethereum', 'fund');
    const w = mountPage();
    const panel = w.findComponent({ name: 'TonswapConversionPanel' });
    panel.vm.$emit('update:paymentAmount', '0.');
    await flushPromises();
    expect(shared.ctx!.plan.value.paymentAmount).toBe('');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('fund');
    expect(panel.props('paymentAmount')).toBe('0.');
  });

  it('takes an Ethereum DAI plan directly to the bridge review', async () => {
    setup('ethereum', 'wallets');
    shared.ctx!.plan.value.paymentAsset = 'dai-ethereum';
    const w = mountPage();
    await button(w, 'getTs.walletsContinue').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
  });

  it('does not promote existing XOR into swap completion and uses finalized net proceeds for the burn suggestion', async () => {
    setup('sora', 'swap');
    shared.ctx!.wallet.accountAssetsAddressTable[XOR.address] = { balance: { transferable: '50000000000000000000' } };
    const w = mountPage();
    await flushPromises();
    w.findComponent({ name: 'SwapFormWidget' }).vm.$emit('submitted', {
      expectedXor: '10',
      transactionHash: '0x' + 'a'.repeat(64),
    });
    await flushPromises();
    expect(button(w, 'getTs.useXor')).toBeUndefined();
    expect(button(w, 'getTs.useXor →')).toBeDefined();
    shared.ctx!.swapProgress.value = { state: 'received', xorReceived: '9.99' } as { state: string };
    await flushPromises();
    expect(button(w, 'getTs.useXor')).toBeDefined();
    expect(shared.ctx!.plan.value.xorAmount).toBe('9.989');
  });
  it('offers existing balances explicitly and supplies the planned burn amount', async () => {
    setup('ethereum', 'bridge');
    shared.ctx!.wallet.accountAssetsAddressTable[XOR.address] = { balance: { transferable: '2000000000000000000' } };
    const w = mountPage();
    await button(w, 'getTs.useXor →').trigger('click');
    await flushPromises();
    expect(w.findComponent({ name: 'TonswapBurnCampaign' }).props('initialAmount')).toBe('2');
    shared.ctx!.wallet.accountAssetsLoading = true;
    await flushPromises();
    expect(w.get('[data-test-name="getTsXorBalance"]').text()).toBe('—');
  });
  it('checks the exact card budget even when no indicative DAI preview was saved', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.daiAmount = '';
    const w = mountPage();
    expect(w.findComponent({ name: 'GetTsCardReadiness' }).props('amount')).toBe('100');
    expect(w.get('[data-test-name="getTsBuyCard"]').attributes('disabled')).toBeDefined();
    quote(w);
    await flushPromises();
    await w.get('[data-test-name="getTsBuyCard"]').trigger('click');
    expect(shared.ctx!.plan.value.daiAmount).toBe('9');
    expect(shared.ctx!.moonpay.setDialogVisibility).toHaveBeenCalledWith(true);
  });
  it('accepts the same exact USD budget with trailing decimal zeros', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.paymentAmount = '100.00';
    const w = mountPage();
    w.findComponent({ name: 'GetTsCardReadiness' }).vm.$emit('checked', {
      allowed: true,
      amount: '100.00',
      expiresAt: Date.now() + 30_000,
      daiAmount: '9',
      conversionEth: '0.017',
      deliveredEth: '0.02',
    });
    await flushPromises();
    expect(w.get('[data-test-name="getTsBuyCard"]').attributes('disabled')).toBeUndefined();
    await w.get('[data-test-name="getTsBuyCard"]').trigger('click');
    expect(shared.ctx!.moonpay.setDialogVisibility).toHaveBeenCalledWith(true);
  });
  it('revokes card handoff for a replaced provider even before the next render', async () => {
    setup('card', 'fund');
    const w = mountPage();
    quote(w);
    await flushPromises();
    shared.ctx!.cardReady.mockReturnValue(false);
    await w.get('[data-test-name="getTsBuyCard"]').trigger('click');
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
  });
  it('rejects a full-cost result for another USD amount and rejects a revoked result', async () => {
    setup('card', 'fund');
    const w = mountPage();
    const review = w.findComponent({ name: 'GetTsCardReadiness' });
    review.vm.$emit('checked', { allowed: true, amount: '10', expiresAt: Date.now() + 30_000 });
    await flushPromises();
    expect(w.get('[data-test-name="getTsBuyCard"]').attributes('disabled')).toBeDefined();
    quote(w);
    await flushPromises();
    review.vm.$emit('checked', { allowed: false, amount: '100', expiresAt: 0 });
    await flushPromises();
    expect(w.get('[data-test-name="getTsBuyCard"]').attributes('disabled')).toBeDefined();
  });
  it('observes a full card review failure without transmitting its budget or estimates', async () => {
    setup('card', 'fund');
    const w = mountPage({ purpose: 'xor' });
    w.findComponent({ name: 'GetTsCardReadiness' }).vm.$emit('checked', {
      allowed: false,
      amount: '100',
      expiresAt: 0,
      reason: 'budget',
      deliveredEth: '0.02',
    });
    await flushPromises();
    expect(shared.ctx!.funnel.record).toHaveBeenCalledWith('quote_blocked', 'fees');
    expect(JSON.stringify(shared.ctx!.funnel.record.mock.calls)).not.toContain('100');
  });
  it('offers explicit aggregate measurement only on Buy XOR and separates matched receipt outcomes', async () => {
    setup('sora', 'swap');
    const w = mountPage({ purpose: 'xor' });
    expect(shared.ctx!.funnel.record).not.toHaveBeenCalled();
    await w.get('[data-test-name="buyXorMeasurementConsent"]').setValue(true);
    expect(shared.ctx!.funnel.setConsent).toHaveBeenCalledWith(true);
    shared.ctx!.funnel.consent.value = true;
    const reference = '0x' + 'a'.repeat(64);
    shared.ctx!.plan.value.references.swap = reference;
    shared.ctx!.swapProgress.value = {
      state: 'received',
      reference: '0x' + 'b'.repeat(64),
      xorReceived: '2',
    } as { state: string };
    await flushPromises();
    expect(shared.ctx!.funnel.record).toHaveBeenCalledWith('swap_submitted');
    expect(shared.ctx!.funnel.record).not.toHaveBeenCalledWith('xor_received');
    shared.ctx!.swapProgress.value = {
      state: 'received',
      reference,
      xorReceived: '2',
    } as { state: string };
    await flushPromises();
    expect(shared.ctx!.funnel.record).toHaveBeenCalledWith('xor_received');
    shared.ctx!.swapProgress.value = { state: 'failed', reference } as { state: string };
    await flushPromises();
    expect(shared.ctx!.funnel.record).toHaveBeenCalledWith('swap_failed');
    expect(shared.ctx!.funnel.record.mock.calls.every((args) => args.length <= 2)).toBe(true);
    expect(mountPage().find('[data-test-name="buyXorMeasurementConsent"]').exists()).toBe(false);
  });
  it('resumes the pending bridge after reviewing wallets instead of restarting funding', async () => {
    setup('ethereum', 'bridge');
    shared.ctx!.plan.value.references.bridge = '0x' + 'a'.repeat(64);
    shared.ctx!.bridgeProgress.value = { state: 'pending' };
    const w = mountPage();
    await w.findAll('.get-ts__phases button')[1].trigger('click');
    await button(w, 'getTs.walletsContinue').trigger('click');
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
    expect(w.text()).toContain('getTs.bridgeProgress.pending');
  });
  it('keeps confirmed funding amounts when an unchanged plan refreshes its indicative preview', async () => {
    setup('ethereum', 'source');
    shared.ctx!.plan.value.references.conversion = '0x' + 'b'.repeat(64);
    shared.ctx!.plan.value.daiAmount = '12.345';
    shared.ctx!.plan.value.xorAmount = '9.876';
    shared.ctx!.conversionProgress.value = {
      state: 'received',
      reference: shared.ctx!.plan.value.references.conversion,
      amount: '12.345',
    };
    const w = mountPage();
    w.findComponent({ name: 'GetTsPlanPreview' }).vm.$emit('preview', {
      state: 'ready',
      feasible: true,
      source: 'ethereum',
      paymentAsset: 'ETH',
      amount: '0.01',
      daiIntent: '13',
      burnableXor: '10',
      estimatedTs: '495',
      expiresAt: Date.now() + 30_000,
    });
    await flushPromises();
    expect(shared.ctx!.plan.value.daiAmount).toBe('12.345');
    expect(shared.ctx!.plan.value.xorAmount).toBe('9.876');
  });
  it('retains a submitted conversion before confirmation and offers a read-only pending recovery', async () => {
    setup('ethereum', 'fund');
    const hash = '0x' + 'c'.repeat(64);
    shared.ctx!.track.mockImplementation((stage, reference) => {
      shared.ctx!.plan.value.references[stage as 'conversion'] = reference;
      return true;
    });
    shared.ctx!.conversionProgress.value = { state: 'pending' };
    const w = mountPage();
    w.findComponent({ name: 'TonswapConversionPanel' }).vm.$emit('submitted', { transactionHash: hash });
    await flushPromises();
    expect(shared.ctx!.track).toHaveBeenCalledWith('conversion', hash);
    expect(w.text()).toContain('getTs.conversionProgress.pending');
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
    expect(w.get(`a[href="https://etherscan.io/tx/${hash}"]`).exists()).toBe(true);
    await button(w, 'getTs.checkStatus').trigger('click');
    expect(shared.ctx!.refresh).toHaveBeenCalled();
    expect(w.text()).not.toContain('getTs.conversionConfirmed');
  });
  it('restores a card conversion without inviting another card purchase and retries only confirmed failure', async () => {
    setup('card', 'fund');
    shared.ctx!.plan.value.references.conversion = '0x' + 'c'.repeat(64);
    shared.ctx!.conversionProgress.value = { state: 'pending' };
    const w = mountPage();
    expect(w.find('[data-test-name="getTsBuyCard"]').exists()).toBe(false);
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
    expect(button(w, 'getTs.retry')).toBeUndefined();
    shared.ctx!.conversionProgress.value = { state: 'unavailable' };
    await flushPromises();
    expect(button(w, 'getTs.retry')).toBeUndefined();
    shared.ctx!.conversionProgress.value = { state: 'failed', reference: shared.ctx!.plan.value.references.conversion };
    await flushPromises();
    await button(w, 'getTs.retry').trigger('click');
    expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(true);
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
  });
  it('rebinds only a verified replacement before any bridge draft is started', async () => {
    setup('ethereum', 'fund');
    const original = '0x' + 'a'.repeat(64);
    const replacement = '0x' + 'b'.repeat(64);
    shared.ctx!.plan.value.references.conversion = original;
    shared.ctx!.conversionProgress.value = { state: 'pending' };
    shared.ctx!.track.mockReturnValue(true);
    const w = mountPage({ purpose: 'xor' });
    const recovery = w.getComponent({ name: 'GetTsConversionRecovery' });
    expect(recovery.props()).toMatchObject({ reference: original, purpose: 'xor' });
    recovery.vm.$emit('verified', { state: 'pending', reference: replacement });
    expect(shared.ctx!.track).not.toHaveBeenCalled();
    recovery.vm.$emit('verified', { state: 'received', reference: replacement, amount: '8' });
    expect(shared.ctx!.track).toHaveBeenCalledWith('conversion', replacement);
    expect(shared.ctx!.refresh).toHaveBeenCalled();
    shared.ctx!.plan.value.references.bridge = '0x' + 'c'.repeat(64);
    await flushPromises();
    expect(w.findComponent({ name: 'GetTsConversionRecovery' }).exists()).toBe(false);
  });
  it('restores exact receipt proceeds and revokes completion when the wallet context cannot verify them', async () => {
    setup('ethereum', 'fund');
    shared.ctx!.plan.value.references.conversion = '0x' + 'c'.repeat(64);
    shared.ctx!.conversionProgress.value = { state: 'received', amount: '9.123456789123456789' };
    const w = mountPage();
    expect(shared.ctx!.plan.value.daiAmount).toBe('9.123456789123456789');
    expect(w.text()).toContain('getTs.conversionConfirmed');
    shared.ctx!.conversionProgress.value = { state: 'unavailable' };
    await flushPromises();
    expect(w.text()).not.toContain('getTs.conversionConfirmed');
    expect(w.text()).toContain('getTs.conversionProgress.unavailable');
  });
  it.each(['swapDraft', 'swap', 'burn'])(
    'protects downstream %s from a late conversion recovery result',
    async (stage) => {
      setup('ethereum', 'fund');
      shared.ctx!.plan.value.daiAmount = '5';
      shared.ctx!.plan.value.references.conversion = '0x' + 'a'.repeat(64);
      shared.ctx!.conversionProgress.value = { state: 'pending' };
      const w = mountPage();
      const recovery = w.getComponent({ name: 'GetTsConversionRecovery' });
      if (stage === 'swapDraft')
        shared.ctx!.plan.value.swapDraft = {
          id: 'purchase-swap:ts:123e4567-e89b-42d3-a456-426614174000',
          amount: '5',
          contextHash: '0x' + 'd'.repeat(64),
        };
      else shared.ctx!.plan.value.references[stage as 'swap' | 'burn'] = '0x' + 'b'.repeat(64);
      recovery.vm.$emit('verified', { state: 'received', reference: '0x' + 'c'.repeat(64), amount: '10' });
      expect(shared.ctx!.track).not.toHaveBeenCalled();
      shared.ctx!.conversionProgress.value = { state: 'received', amount: '10' };
      await flushPromises();
      expect(shared.ctx!.plan.value.daiAmount).toBe('5');
      expect(w.findComponent({ name: 'GetTsConversionRecovery' }).exists()).toBe(false);
    }
  );
  it.each(['draft', 'submitted'])(
    'preserves the reviewed bridge amount when conversion evidence refreshes (%s)',
    (stage) => {
      setup('ethereum', 'bridge');
      shared.ctx!.plan.value.daiAmount = '5';
      shared.ctx!.plan.value.references.conversion = '0x' + 'c'.repeat(64);
      if (stage === 'draft')
        shared.ctx!.plan.value.bridgeDraft = {
          id: 'reviewed-bridge-row',
          amount: '5',
          contextHash: '0x' + 'd'.repeat(64),
        };
      else shared.ctx!.plan.value.references.bridge = '0x' + 'b'.repeat(64);
      shared.ctx!.conversionProgress.value = { state: 'received', amount: '10' };
      mountPage();
      expect(shared.ctx!.plan.value.daiAmount).toBe('5');
    }
  );
  it('retries a failed TON-route Ethereum conversion without repeating the TON handoff or reusing TON units', async () => {
    setup('ton', 'fund');
    shared.ctx!.ton.address.value = 'ton-address';
    shared.ctx!.ton.chain.value = '-239';
    shared.ctx!.plan.value.references.conversion = '0x' + 'c'.repeat(64);
    shared.ctx!.conversionProgress.value = { state: 'failed', reference: shared.ctx!.plan.value.references.conversion };
    const w = mountPage();
    await button(w, 'getTs.retry').trigger('click');
    const panel = w.findComponent({ name: 'TonswapConversionPanel' });
    expect(panel.props('source')).toBe('ethereum');
    expect(panel.props('paymentAmount')).toBe('');
    panel.vm.$emit('update:paymentAmount', '0.01');
    await flushPromises();
    expect(shared.ctx!.plan.value.paymentAmount).toBe('10');
    expect(panel.props('paymentAmount')).toBe('0.01');
  });
  it('keeps the before-gas qualification beside the sidebar estimate after planning', async () => {
    setup();
    const w = mountPage();
    w.findComponent({ name: 'GetTsPlanPreview' }).vm.$emit('preview', {
      state: 'ready',
      feasible: true,
      source: 'ethereum',
      paymentAsset: 'ETH',
      amount: '0.01',
      daiIntent: '10',
      burnableXor: '2',
      estimatedTs: '99',
      costCoverage: 'partial',
      expiresAt: Date.now() + 30_000,
    });
    await flushPromises();
    await button(w, 'getTs.continuePlan').trigger('click');
    expect(w.get('.get-ts__estimate').text()).toContain('getTs.preview.beforeGasTs');
  });
  it('offers a general XOR purchase on the start screen without campaign branding or an existing-XOR route', async () => {
    setup('card', 'source');
    const w = mountPage({ purpose: 'xor' });
    expect(w.get('h1').text()).toBe('buyXor.title');
    expect(w.get('.get-ts__brand').text()).toBe('POLKASWAP · XOR');
    expect(w.find('a[href="https://tonswap.org/ts"]').exists()).toBe(false);
    expect(w.find('[data-source="xor"]').exists()).toBe(false);
    expect(w.findComponent({ name: 'GetTsPlanPreview' }).exists()).toBe(false);
    expect(w.findComponent({ name: 'GetTsRouteRequirements' }).exists()).toBe(false);
    expect(w.get('.get-ts__layout').classes()).toContain('get-ts__layout--quick');
    const start = w.getComponent({ name: 'BuyXorQuickStart' });
    expect(start.props()).toMatchObject({ source: 'card', amount: '100', paymentAsset: 'USD', locked: false });
    start.vm.$emit('preview', {
      purpose: 'xor',
      state: 'ready',
      feasible: true,
      source: 'card',
      paymentAsset: 'USD',
      amount: '100',
      daiIntent: '90',
      spendableXor: '10',
      costCoverage: 'partial',
      expiresAt: Date.now() + 30_000,
    });
    await flushPromises();
    expect(shared.ctx!.plan.value.xorAmount).toBe('10');
    expect(start.props('canContinue')).toBe(true);
    start.vm.$emit('continue');
    await flushPromises();
    expect(shared.ctx!.router.replace).toHaveBeenLastCalledWith({
      path: '/buy-xor',
      query: { source: 'card', step: 'wallets' },
    });
    expect(w.findComponent({ name: 'GetTsWalletSetup' }).props('purpose')).toBe('xor');
    expect(w.get('.get-ts__estimate').text()).toContain('10 XOR');
    expect(w.get('.get-ts__estimate').text()).not.toContain('TS');
    expect(w.text()).not.toContain('getTs.claimNotice');
  });
  it('ends a general purchase at verified XOR without reserving a burn fee or automatically burning', async () => {
    setup('sora', 'swap');
    shared.ctx!.settings.networkFees.BurnWithRemark = '';
    const w = mountPage({ purpose: 'xor' });
    await flushPromises();
    w.findComponent({ name: 'SwapFormWidget' }).vm.$emit('submitted', {
      expectedXor: '10',
      transactionHash: '0x' + 'a'.repeat(64),
    });
    await flushPromises();
    expect(shared.ctx!.plan.value.xorAmount).toBe('10');
    expect(button(w, 'buyXor.viewWallet')).toBeUndefined();
    shared.ctx!.swapProgress.value = { state: 'received', xorReceived: '9.99' } as { state: string };
    await flushPromises();
    expect(shared.ctx!.plan.value.xorAmount).toBe('9.99');
    expect(w.text()).toContain('buyXor.receivedTitle');
    expect(w.findComponent({ name: 'TonswapBurnCampaign' }).exists()).toBe(false);
    expect(button(w, 'getTs.useXor')).toBeUndefined();
    await button(w, 'buyXor.viewWallet').trigger('click');
    expect(shared.ctx!.router.push).toHaveBeenCalledWith('/wallet');
  });
  it('ignores a delayed campaign preview in the general purchase', async () => {
    setup('card', 'source');
    const w = mountPage({ purpose: 'xor' });
    const previousAmount = shared.ctx!.plan.value.xorAmount;
    const start = w.getComponent({ name: 'BuyXorQuickStart' });
    start.vm.$emit('preview', {
      purpose: 'ts',
      state: 'ready',
      feasible: true,
      source: 'card',
      paymentAsset: 'USD',
      amount: '100',
      daiIntent: '90',
      burnableXor: '123',
      estimatedTs: '999',
      expiresAt: Date.now() + 30_000,
    });
    await flushPromises();
    expect(shared.ctx!.plan.value.xorAmount).toBe(previousAmount);
    start.vm.$emit('continue');
    await flushPromises();
    expect(w.find('.get-ts__estimate').exists()).toBe(false);
  });
  it('routes Buy XOR start-screen intents through the existing plan handlers and gate', async () => {
    setup('card', 'source');
    const w = mountPage({ purpose: 'xor' });
    const start = () => w.getComponent({ name: 'BuyXorQuickStart' });
    start().vm.$emit('selectSource', 'ethereum');
    await flushPromises();
    expect(shared.ctx!.route.query).toEqual({ source: 'ethereum', step: 'source' });
    expect(shared.ctx!.plan.value).toMatchObject({ paymentAsset: 'eth', paymentAmount: '' });
    start().vm.$emit('update:paymentAsset', 'USDT');
    start().vm.$emit('update:amount', '25');
    await flushPromises();
    expect(shared.ctx!.plan.value).toMatchObject({ paymentAsset: 'usdt-ethereum', paymentAmount: '25' });
    expect(start().props()).toMatchObject({ source: 'ethereum', amount: '25', paymentAsset: 'USDT' });
    start().vm.$emit('preview', {
      purpose: 'xor',
      state: 'blocked',
      feasible: false,
      reason: 'price-impact',
      source: 'ethereum',
      paymentAsset: 'USDT',
      amount: '25',
    });
    await flushPromises();
    expect(start().props('canContinue')).toBe(false);
    start().vm.$emit('continue');
    await flushPromises();
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('source');
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
  });
  it('resumes an unresolved Buy XOR purchase from the locked start screen', async () => {
    setup('card', 'source');
    const hash = '0x' + 'a'.repeat(64);
    shared.ctx!.plan.value.references.conversion = hash;
    shared.ctx!.conversionProgress.value = { state: 'pending', reference: hash };
    const w = mountPage({ purpose: 'xor' });
    const start = w.getComponent({ name: 'BuyXorQuickStart' });
    expect(start.props('locked')).toBe(true);
    start.vm.$emit('continue');
    await flushPromises();
    expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('fund');
    expect(shared.ctx!.moonpay.setDialogVisibility).not.toHaveBeenCalled();
    expect(shared.ctx!.track).not.toHaveBeenCalled();
  });
  it('moves focus to the Buy XOR start screen when returning to the plan', async () => {
    setup('card', 'wallets');
    const w = mountPage({ purpose: 'xor' });
    await w.findAll('.get-ts__phases button')[0].trigger('click');
    await flushPromises();
    const start = w.getComponent({ name: 'BuyXorQuickStart' });
    expect((start.vm as unknown as { focus: ReturnType<typeof vi.fn> }).focus).toHaveBeenCalledWith({
      preventScroll: true,
    });
  });
  it('walks Buy XOR card buyers through copying the Ethereum address for MoonPay', async () => {
    setup('card', 'fund');
    const w = mountPage({ purpose: 'xor' });
    const steps = w.get('[data-test-name="buyXorCardSteps"]');
    expect(steps.findAll('li')).toHaveLength(3);
    expect(steps.get('code').text()).toBe('0x1111111111111111111111111111111111111111');
    expect(steps.text()).not.toContain('cnSoraAccount');
    expect(w.find('.get-ts__destination').exists()).toBe(false);
    await button(w, 'getTs.copyAddress').trigger('click');
    expect(shared.ctx!.copy).toHaveBeenCalledWith('0x1111111111111111111111111111111111111111', expect.anything());
    expect(steps.text()).toContain('assets.copied');
    shared.ctx!.external.evmAddress.value = '0x2222222222222222222222222222222222222222';
    await flushPromises();
    expect(w.get('[data-test-name="buyXorCardSteps"]').text()).toContain('getTs.copyAddress');
    shared.ctx!.copy.mockClear();
    quote(w);
    await flushPromises();
    const open = w.get('[data-test-name="getTsBuyCard"]');
    expect(open.text()).toBe('buyXor.card.open');
    await open.trigger('click');
    expect(shared.ctx!.copy).toHaveBeenCalledWith('0x2222222222222222222222222222222222222222', undefined);
    expect(shared.ctx!.moonpay.setDialogVisibility).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('keeps the Get TS card step and its copy-free MoonPay button unchanged', async () => {
    setup('card', 'fund');
    const w = mountPage();
    expect(w.find('[data-test-name="buyXorCardSteps"]').exists()).toBe(false);
    expect(w.get('.get-ts__destination code').text()).toBe('0x1111111111111111111111111111111111111111');
    quote(w);
    await flushPromises();
    await w.get('[data-test-name="getTsBuyCard"]').trigger('click');
    expect(shared.ctx!.copy).not.toHaveBeenCalled();
    expect(shared.ctx!.moonpay.setDialogVisibility).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('keeps a generic bridge route separate from the TONSWAP campaign', async () => {
    setup('ethereum', 'bridge');
    const w = mountPage({ purpose: 'xor' });
    await button(w, 'getTs.openBridge').trigger('click');
    expect(shared.ctx!.router.push).toHaveBeenCalledWith({ path: '/bridge', query: { buyXor: '1', asset: 'DAI' } });
    expect(w.text()).toContain('buyXor.claimWallet');
    expect(w.text()).not.toContain('getTs.claimNotice');
  });
  it('rejects a burn deep link in the generic purchase', () => {
    setup('sora', 'burn');
    const w = mountPage({ purpose: 'xor' });
    expect(w.get('.get-ts__workspace').attributes('data-step')).not.toBe('burn');
    expect(w.findComponent({ name: 'TonswapBurnCampaign' }).exists()).toBe(false);
  });
  it.each(['ts', 'xor'] as const)(
    'keeps Ethereum DAI out of ETH conversion when navigating Back (%s)',
    async (purpose) => {
      setup('ethereum', 'bridge');
      shared.ctx!.plan.value.paymentAsset = 'dai-ethereum';
      shared.ctx!.plan.value.paymentAmount = '10';
      const w = mountPage({ purpose });
      await button(w, '← getTs.back').trigger('click');
      expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('wallets');
      expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
      await button(w, 'getTs.walletsContinue').trigger('click');
      expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
      expect(shared.ctx!.plan.value.paymentAmount).toBe('10');
    }
  );
  it.each(['ts', 'xor'] as const)(
    'redirects a conversion deep link to bridge review for Ethereum DAI (%s)',
    (purpose) => {
      setup('ethereum', 'fund');
      shared.ctx!.plan.value.paymentAsset = 'dai-ethereum';
      shared.ctx!.plan.value.paymentAmount = '10';
      const w = mountPage({ purpose });
      expect(w.get('.get-ts__workspace').attributes('data-step')).toBe('bridge');
      expect(w.findComponent({ name: 'TonswapConversionPanel' }).exists()).toBe(false);
      expect(w.findComponent({ name: 'Moonpay' }).exists()).toBe(false);
    }
  );
});
