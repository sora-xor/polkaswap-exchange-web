import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { botTradingRoutes } from '@/features/bot-trading/routes';

import type { BotAiClient } from '@/features/bot-trading/ai';
import type { BotAiModel } from '@/features/bot-trading/ai-models';
import type { BotDefinition, BotOrder, BotResearchSnapshot } from '@/features/bot-trading/types';
import BotsPage from '@/features/bot-trading/pages/BotsPage.vue';
import { AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE, isAutopilotErrorKey } from '@/features/bot-trading/autopilot-diagnostics';
import * as autopilotExposure from '@/features/bot-trading/autopilot-exposure';
import { goalStorageBot, goalStorageOrder, GOAL_TEST_START } from './goal-storage-fixtures';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import {
  copyAutopilotTrainingWatchDiagnostics,
  copyAutopilotWatchFailure,
  writeAutopilotWatchCheckpoint,
  type AutopilotWatchCheckpoint,
} from '@/features/bot-trading/autopilot-watch-checkpoint';

const mocks = vi.hoisted(() => ({
  translate: vi.fn((key: string) => key),
  controller: null as unknown,
  connect: vi.fn(),
  connection: null as unknown,
  loadFees: vi.fn(),
  clearFees: vi.fn(),
  loadHistory: vi.fn(),
  clearHistory: vi.fn(),
  createAi: vi.fn(),
}));
vi.mock('@polkadot/util-crypto', async (original) => ({
  ...(await original<typeof import('@polkadot/util-crypto')>()),
  decodeAddress: () => new Uint8Array(),
  cryptoWaitReady: async () => true,
}));

vi.mock('@/features/bot-trading/ai', async (original) => ({
  ...(await original<typeof import('@/features/bot-trading/ai')>()),
  createBotAiClient: mocks.createAi,
}));
vi.mock('@/features/bot-trading/controller', () => ({ useBotTrading: () => mocks.controller }));
vi.mock('@/features/bot-trading/research-fees', () => ({
  createResearchFeeLoader: () => ({ load: mocks.loadFees, clear: mocks.clearFees }),
}));
vi.mock('@/features/bot-trading/playground-history', () => ({
  createPlaygroundHistoryLoader: () => ({ load: mocks.loadHistory, clear: mocks.clearHistory }),
}));
vi.mock('@/features/bot-trading/autopilot-history', () => ({
  createAutopilotHistoryLoader: () => ({ load: mocks.loadHistory, clear: vi.fn() }),
  createAutopilotHistoryReadinessReader: () => vi.fn(async () => null),
}));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: mocks.translate }) }));
const swapStore = vi.hoisted(() => ({ setTokenFromAddress: vi.fn(), setTokenToAddress: vi.fn() }));
vi.mock('@/features/swap/stores/useSwapStore', async (original) => ({
  ...(await original<typeof import('@/features/swap/stores/useSwapStore')>()),
  useSwapStore: () => swapStore,
}));
vi.mock('@/stores/wallet', async (original) => ({
  ...(await original<typeof import('@/stores/wallet')>()),
  useWalletStore: () => ({ whitelistIdsBySymbol: {} }),
}));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({ connectSoraWallet: mocks.connect, ...(mocks.connection as object) }),
}));

/** Minimal precise portfolio with a real distinction between paper and live execution. */
function bot(mode: 'paper' | 'live' = 'paper'): BotDefinition {
  return {
    version: 1,
    id: 'bot-1',
    name: 'XOR accumulator',
    mode,
    status: 'idle',
    account: 'account',
    network: 'main',
    assetIn: { address: 'xor', symbol: 'XOR', decimals: 18 },
    assetOut: { address: 'val', symbol: 'VAL', decimals: 18 },
    strategy: {
      kind: 'dca',
      amount: '1',
      intervalMs: 3_600_000,
      threshold: '1',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { xor: '1000000000000000000', val: '1000000000000000000' },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '3',
      feeAsset: { address: 'xor', symbol: 'XOR', decimals: 18 },
      feeBudgetCodec: '1000000000000000000',
      sessionDurationMs: 3_600_000,
    },
    portfolio: {
      initial: { xor: '100000000000000000000', val: '0' },
      holdings: { xor: '100000000000000000000', val: '0' },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: 'test-model',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
  };
}

/** Mock the controller boundary so component tests never access networks or wallet keys. */
function controller(initial: BotDefinition[] = []) {
  const bots = ref(initial);
  const selectedId = ref(initial[0]?.id || '');
  const selectedBot = computed(() => bots.value.find((item) => item.id === selectedId.value) || null);
  return {
    bots,
    selectedId,
    selectedBot,
    readGoalOrders: vi.fn(async (_id: string): Promise<BotOrder[]> => []),
    assets: ref([bot().assetIn, bot().assetOut]),
    loading: ref(false),
    busy: ref(false),
    error: ref(''),
    chartCandles: ref([]),
    backtestResult: ref(null),
    walletConnected: ref(true),
    externalWallet: ref(false),
    connectionIdentity: ref('review-connection'),
    readConnectionIdentity: vi.fn(() => 'review-connection'),
    readNetworkIdentity: vi.fn(() => 'review-network'),
    readWalletFunding: vi.fn(async (assetInAddress: string) => ({
      assetInAddress,
      assetInCodec: '9102677405771664461',
      xorCodec: '119868161609067204',
    })),
    prepareLiveBot: vi.fn(async (template: BotDefinition, research: BotResearchSnapshot) => ({
      ...JSON.parse(JSON.stringify(template)),
      id: 'review-bot',
      mode: 'live',
      research,
    })),
    saveLiveBot: vi.fn(async (draft: BotDefinition) => {
      bots.value.push(draft);
      selectedId.value = draft.id;
      return draft.id;
    }),
    discardLiveReview: vi.fn(),
    previewLiveFunding: vi.fn(async () => ({
      sufficient: true,
      assets: [
        { asset: bot().assetIn, requiredCodec: '100000000000000000000', availableCodec: '200000000000000000000' },
      ],
    })),
    providerConnectedIds: ref<string[]>([]),
    sessionActiveIds: ref<string[]>([]),
    initialize: vi.fn().mockResolvedValue(undefined),
    selectBot: vi.fn((id: string) => {
      selectedId.value = id;
    }),
    createBot: vi.fn().mockResolvedValue(undefined),
    createPaperBot: vi.fn().mockResolvedValue(undefined),
    updateBot: vi.fn().mockResolvedValue(undefined),
    resetGoal: vi.fn().mockResolvedValue(undefined),
    startBot: vi.fn().mockResolvedValue(undefined),
    pauseBot: vi.fn().mockResolvedValue(undefined),
    stopBot: vi.fn().mockResolvedValue(undefined),
    deleteBot: vi.fn().mockResolvedValue(undefined),
    backtestBot: vi.fn().mockResolvedValue(undefined),
    connectProviderClient: vi.fn().mockResolvedValue(undefined),
    exportBot: vi.fn(),
    suggestStrategy: vi.fn().mockResolvedValue({ ...bot().strategy, kind: 'threshold', threshold: '2' }),
  };
}

let router: Router;
const render = () =>
  mount(BotsPage, {
    global: {
      plugins: [router],
      stubs: { Teleport: true, BotPlayground: true, StrategyLab: true, QuantCommandCenter: true },
    },
  });

describe('BotsPage', () => {
  let state: ReturnType<typeof controller>;
  let client: BotAiClient;
  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: botTradingRoutes.map((route) => ({ ...route, component: {} })),
    });
    await router.push('/bots/lab');
    await router.isReady();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    state = controller();
    mocks.controller = state;
    mocks.connection = { isLoggedIn: ref(true), soraAddress: ref('account'), isSoraAccountDialogVisible: ref(false) };
    mocks.connect.mockReset().mockImplementation(() => {
      (
        mocks.connection as { isSoraAccountDialogVisible: ReturnType<typeof ref<boolean>> }
      ).isSoraAccountDialogVisible.value = true;
    });
    mocks.loadFees.mockReset();
    mocks.loadHistory.mockReset();
    client = {
      listModels: vi.fn().mockResolvedValue([
        { id: 'current-model', name: 'Current account model', createdAt: 2 },
        { id: 'other-model', name: 'Other account model', createdAt: 1 },
      ]),
      selectModel: vi.fn(),
      disconnect: vi.fn(),
      propose: vi.fn(),
      suggest: vi.fn(),
    };
    mocks.translate.mockReset().mockImplementation((key: string) => key);
    mocks.createAi.mockReset().mockReturnValue(client);
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loads only selected exact order evidence and discards an older asynchronous reply', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(GOAL_TEST_START);
    const first = goalStorageBot('first');
    const second = goalStorageBot('second');
    state = controller([first, second]);
    mocks.controller = state;
    const pending = new Map<string, (orders: BotOrder[]) => void>();
    state.readGoalOrders.mockImplementation((id) => new Promise((resolve) => pending.set(id, resolve)));
    await router.push('/bots/my-bots');
    const wrapper = render();
    await flushPromises();
    expect(state.readGoalOrders).toHaveBeenCalledTimes(1);
    expect(state.readGoalOrders).toHaveBeenLastCalledWith(first.id);
    state.selectedId.value = second.id;
    await flushPromises();
    expect(state.readGoalOrders).toHaveBeenLastCalledWith(second.id);
    pending.get(second.id)!([goalStorageOrder(second)]);
    await flushPromises();
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.pending');
    pending.get(first.id)!([]);
    await flushPromises();
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.pending');
    expect(wrapper.get('[data-testid="goal-net-value"]').text()).toBe('—');
    expect(state.startBot).not.toHaveBeenCalled();
    expect(state.prepareLiveBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens the beginner flow by default and keeps the research workspace under Advanced', async () => {
    await router.push('/bots');
    const wrapper = render();
    expect(wrapper.get('[data-testid="autopilot-go"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="autopilot-capital"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="autopilot-asset-out"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="create-goal"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'StrategyLab' }).exists()).toBe(false);
    await wrapper.get('[data-testid="autopilot-advanced"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.params.section).toBe('lab');
    expect(wrapper.get('[data-testid="create-goal"]').isVisible()).toBe(true);
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('checks the connected wallet beside GO and refreshes without starting a bot', async () => {
    await router.push('/bots');
    state.assets.value = [KUSD, XOR];
    const wrapper = render();
    await wrapper.get('[data-testid="autopilot-asset-in"]').setValue(KUSD.address);
    await wrapper.get('[data-testid="autopilot-capital"]').setValue('10');
    await flushPromises();
    expect(state.readWalletFunding).toHaveBeenCalledWith(KUSD.address);
    expect(wrapper.get('[data-testid="autopilot-setup-funding-status"]').text()).toBe(
      'bots.autopilot.setupFunding.short'
    );
    const priorReads = state.readWalletFunding.mock.calls.length;
    await wrapper.get('[data-testid="autopilot-setup-funding-refresh"]').trigger('click');
    await flushPromises();
    expect(state.readWalletFunding).toHaveBeenCalledTimes(priorReads + 1);
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('renders a reloaded tc1 watch under another wallet without assigning its funds or limits to that wallet', async () => {
    await router.push('/bots');
    const now = Date.parse('2026-09-26T00:45:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const genesis = `0x${'ab'.repeat(32)}`;
    const network = JSON.stringify([true, genesis, 'wss://node', 130]);
    const identity = (address: string) =>
      JSON.stringify([true, address, 'polkadot-js', true, genesis, 'wss://node', 130]);
    const checkpoint: AutopilotWatchCheckpoint = {
      version: 1,
      savedAt: now - 3_600_000,
      identity: identity('tc1-public-address'),
      network,
      assistantKind: 'desktop',
      input: {
        assetInAddress: KUSD.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        maxLossPercent: '10',
        targetReturnPercent: '5',
        title: 'Maximize XOR',
        valuationAsset: 'output',
      },
      lastAttemptedCompletedThrough: now - 45 * 60_000,
    };
    checkpoint.trainingDiagnostics = copyAutopilotTrainingWatchDiagnostics(
      { stage: 'training', failures: [{ candidate: 1, reasons: ['netLoss'] }] },
      checkpoint.lastAttemptedCompletedThrough,
      checkpoint
    )!;
    expect(writeAutopilotWatchCheckpoint(checkpoint)).toBe(true);
    const stored = sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1');
    state.assets.value = [];
    state.connectionIdentity.value = identity('sora-store-public-address');
    state.readConnectionIdentity.mockImplementation(() => state.connectionIdentity.value);
    state.readNetworkIdentity.mockReturnValue(network);
    const connection = mocks.connection as { soraAddress: ReturnType<typeof ref<string>> };
    connection.soraAddress.value = 'sora-store-public-address';
    const wrapper = render();
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
    state.assets.value = [KUSD, XOR];
    await flushPromises();
    expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
    expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
    expect(wrapper.get('[data-testid="autopilot-watch-owner"]').text()).toBe('tc1-public-address');
    expect(wrapper.get('[data-testid="autopilot-diagnostics"]').text()).toContain('bots.autopilot.diagnostics.netLoss');
    expect(wrapper.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="autopilot-wallet-address"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="autopilot"]').text()).not.toContain('sora-store-public-address');
    expect(state.readWalletFunding).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="autopilot-watch-wallet"]').trigger('click');
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
    state.connectionIdentity.value = identity('tc1-public-address');
    connection.soraAddress.value = 'tc1-public-address';
    await flushPromises();
    expect(wrapper.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
    expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
    expect(state.readWalletFunding).toHaveBeenCalledWith(KUSD.address);
    expect(state.prepareLiveBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    expect(mocks.createAi).not.toHaveBeenCalled();
    expect(mocks.loadHistory).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
    wrapper.unmount();
  });

  it('exposes goal creation in the advanced workspace and saves precise paper settings without starting', async () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="create-goal"]').isVisible()).toBe(true);
    await wrapper.get('[data-testid="create-goal"]').trigger('click');
    const value = {
      name: 'Grow my capital',
      title: 'Grow my capital',
      assetInAddress: 'xor',
      assetOutAddress: 'val',
      allocation: '12.000000000000000001',
      feeBudget: '1',
      targetReturnPercent: '5',
      maxLossPercent: '3',
      durationMs: 86400000,
    };
    wrapper.getComponent({ name: 'BotGoalSetup' }).vm.$emit('create', value);
    await flushPromises();
    expect(state.createBot).toHaveBeenCalledWith({
      name: value.name,
      assetInAddress: 'xor',
      assetOutAddress: 'val',
      allocation: value.allocation,
      feeBudget: '1',
      strategyKind: 'ai',
      goal: { title: value.title, targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86400000 },
    });
    expect(state.startBot).not.toHaveBeenCalled();
    expect(mocks.createAi).not.toHaveBeenCalled();
    expect(router.currentRoute.value.params.section).toBe('my-bots');
    wrapper.unmount();
  });

  it('saves an unconnected Jev goal without an endpoint while connection still requires HTTPS', async () => {
    const existing = bot();
    existing.provider = 'jev';
    existing.model = 'jev-latest';
    existing.strategy.kind = 'ai';
    existing.goal = { title: 'Grow', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86400000 };
    state.bots.value = [existing];
    state.selectedId.value = existing.id;
    const wrapper = render();
    const endpoint = wrapper.get('input[type="url"]').element as HTMLInputElement;
    expect(endpoint.value).toBe('');
    expect(endpoint.required).toBe(false);
    expect(endpoint.checkValidity()).toBe(true);

    const goalInput = (key: string) => {
      const label = wrapper.findAll('label').find((item) => item.text() === `bots.goals.${key}`);
      if (!label) throw new Error(`Missing goal label ${key}`);
      return label.get('input');
    };
    await goalInput('titleLabel').setValue('My revised goal');
    await goalInput('targetLabel').setValue('7.25');
    await goalInput('lossLabel').setValue('2.5');
    await wrapper.get('[data-testid="goal-edit-duration"]').setValue(604800000);
    const settings = wrapper.get('[data-testid="save-settings"]').element.closest('form') as HTMLFormElement;
    expect(settings.checkValidity()).toBe(true);
    settings.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(state.updateBot).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '',
        provider: 'jev',
        goal: { title: 'My revised goal', targetReturnPercent: '7.25', maxLossPercent: '2.5', durationMs: 604800000 },
      })
    );
    expect(state.startBot).not.toHaveBeenCalled();
    expect(mocks.createAi).not.toHaveBeenCalled();
    expect(client.listModels).not.toHaveBeenCalled();
    expect(client.propose).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="goal-connect"]').trigger('click');
    const connectionEndpoint = wrapper.get('[data-testid="jev-endpoint"]').element as HTMLInputElement;
    expect(connectionEndpoint.required).toBe(true);
    expect(connectionEndpoint.checkValidity()).toBe(false);
    await wrapper.get('[data-testid="jev-endpoint"]').setValue('http://relay.example/jev');
    expect(connectionEndpoint.checkValidity()).toBe(false);
    await wrapper.get('[data-testid="jev-endpoint"]').setValue('https://relay.example/jev');
    expect((wrapper.get('[data-testid="jev-endpoint"]').element as HTMLInputElement).checkValidity()).toBe(true);
    expect(state.connectProviderClient).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('connects the fixed Jev model through the explicit endpoint without catalog discovery or signing', async () => {
    const existing = bot();
    existing.provider = 'jev';
    existing.model = 'jev-latest';
    existing.strategy.kind = 'ai';
    existing.goal = { title: 'Grow', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86400000 };
    state.bots.value = [existing];
    state.selectedId.value = existing.id;
    const wrapper = render();
    expect(wrapper.find('[data-testid="suggest-strategy"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="backtest"]').exists()).toBe(false);
    await wrapper.get('[data-testid="goal-connect"]').trigger('click');
    await wrapper.get('[data-testid="jev-endpoint"]').setValue('https://relay.example/jev');
    await wrapper.get('[data-testid="provider-key"]').setValue('session-only-key');
    await wrapper.get('[data-testid="provider-form"]').trigger('submit');
    await flushPromises();
    expect(mocks.createAi).toHaveBeenCalledWith('jev', {
      apiKey: 'session-only-key',
      model: 'jev-latest',
      endpoint: 'https://relay.example/jev',
    });
    expect(client.listModels).not.toHaveBeenCalled();
    expect(state.connectProviderClient).toHaveBeenCalledWith(
      existing.id,
      client,
      { provider: 'jev', model: 'jev-latest', endpoint: 'https://relay.example/jev' },
      expect.any(AbortSignal)
    );
    expect(JSON.stringify(state.updateBot.mock.calls)).not.toContain('session-only-key');
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('routes an unconnected AI start to connection setup and exposes an explicit completed-goal reset', async () => {
    const existing = bot();
    existing.provider = 'jev';
    existing.model = 'jev-latest';
    existing.strategy.kind = 'ai';
    existing.goal = { title: 'Grow', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86400000 };
    state.bots.value = [existing];
    state.selectedId.value = existing.id;
    const wrapper = render();
    await wrapper.get('[data-testid="start"]').trigger('click');
    expect(wrapper.find('[data-testid="provider-form"]').exists()).toBe(true);
    expect(state.startBot).not.toHaveBeenCalled();
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    state.bots.value[0].goalState = {
      startedAt: 1,
      baselineValue: '100',
      lastValue: '105',
      returnPercent: '5',
      outcome: 'target',
      completedAt: 2,
    };
    await flushPromises();
    expect(wrapper.get('[data-testid="start"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="goal-reset"]').trigger('click');
    await flushPromises();
    expect(state.resetGoal).toHaveBeenCalledWith(existing.id);
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  /** Completed study metadata stays descriptive and grants no signing authority. */
  function completedResearch(): BotResearchSnapshot {
    return {
      version: 1,
      source: 'historical',
      testedAt: 1,
      startAt: 0,
      endAt: 1,
      coverage: 1,
      validation: 'none',
      trainPercent: 70,
      folds: 3,
      optimized: false,
      returnPercent: '1',
      drawdownPercent: '2',
      trades: 3,
      networkFeeXor: '0.1',
      swapFeePercent: '0.6',
    };
  }

  it('reviews a selected result directly without creating a paper bot or signing', async () => {
    const wrapper = render();
    const template = bot();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', template, {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    expect(state.prepareLiveBot).toHaveBeenCalledWith(template, completedResearch(), {
      genesisHash: 'genesis',
      denominator: '1',
    });
    expect(wrapper.get('[data-testid="consent-form"]').text()).toContain('bots.startFlow.reviewIntro');
    expect(wrapper.get('[data-testid="review-limits"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="review-limits"]').text()).toContain('bots.slippage');
    expect(wrapper.find('details, summary').exists()).toBe(false);
    expect(wrapper.get('[data-testid="signing-behavior"]').text()).toContain('bots.startFlow.internalSigning');
    expect(state.createPaperBot).not.toHaveBeenCalled();
    expect(state.saveLiveBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('continues the exact result after connecting, but requires explicit consent to start', async () => {
    state.walletConnected.value = false;
    const connection = mocks.connection as {
      isLoggedIn: ReturnType<typeof ref<boolean>>;
      isSoraAccountDialogVisible: ReturnType<typeof ref<boolean>>;
    };
    connection.isLoggedIn.value = false;
    const wrapper = render();
    const template = bot();
    template.strategy.amount = '0.123456789123456789';
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', template, {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(state.prepareLiveBot).not.toHaveBeenCalled();
    template.strategy.amount = '999';
    connection.isLoggedIn.value = true;
    state.walletConnected.value = true;
    connection.isSoraAccountDialogVisible.value = false;
    await flushPromises();
    expect(state.prepareLiveBot.mock.calls[0][0].strategy.amount).toBe('0.123456789123456789');
    expect(state.startBot).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    expect(state.saveLiveBot).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="wallet-password"]').setValue('local-secret');
    await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    await flushPromises();
    expect(state.saveLiveBot).toHaveBeenCalledOnce();
    expect(state.startBot).toHaveBeenCalledWith('review-bot', {
      password: 'local-secret',
      expectedConnection: 'review-connection',
    });
    expect(router.currentRoute.value.params.section).toBe('my-bots');
    expect(wrapper.find('[data-testid="consent-form"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('cancels a dismissed wallet connection and never revives it on a later login', async () => {
    state.walletConnected.value = false;
    const connection = mocks.connection as {
      isLoggedIn: ReturnType<typeof ref<boolean>>;
      isSoraAccountDialogVisible: ReturnType<typeof ref<boolean>>;
    };
    connection.isLoggedIn.value = false;
    const wrapper = render();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', bot(), {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    connection.isSoraAccountDialogVisible.value = false;
    await flushPromises();
    state.walletConnected.value = true;
    connection.isLoggedIn.value = true;
    await flushPromises();
    expect(state.prepareLiveBot).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="start-progress"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('discards an in-flight preparation after cancellation, without saving or starting it', async () => {
    let resolve!: (draft: ReturnType<typeof bot>) => void;
    state.prepareLiveBot.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const wrapper = render();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', bot(), {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    await wrapper.get('[data-testid="cancel-start-intent"]').trigger('click');
    resolve({ ...bot('live'), id: 'cancelled-draft' });
    await flushPromises();
    expect(state.discardLiveReview).toHaveBeenCalledWith('cancelled-draft');
    expect(state.saveLiveBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="consent-form"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each(['wallet', 'network'])('clears review and consent when %s changes', async (kind) => {
    const wrapper = render();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', bot(), {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    await wrapper.get('[data-testid="wallet-password"]').setValue('must-clear');
    await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
    if (kind === 'network') state.readNetworkIdentity.mockReturnValue('changed-network');
    else state.readConnectionIdentity.mockReturnValue('changed-wallet');
    state.connectionIdentity.value = 'changed-context';
    await flushPromises();
    expect(wrapper.find('[data-testid="consent-form"]').exists()).toBe(false);
    expect(state.discardLiveReview).toHaveBeenCalledWith('review-bot');
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('retains one saved draft on a failed start and clears secrets before retrying', async () => {
    state.startBot.mockRejectedValueOnce(new Error('bots.errors.balance'));
    const wrapper = render();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', bot(), {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    await wrapper.get('[data-testid="wallet-password"]').setValue('local-secret');
    await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    await flushPromises();
    expect(state.saveLiveBot).toHaveBeenCalledOnce();
    expect(wrapper.get<HTMLInputElement>('[data-testid="wallet-password"]').element.value).toBe('');
    expect(wrapper.get('[data-testid="consent-form"]').text()).toContain('bots.errors.balance');
    await wrapper.get('[data-testid="wallet-password"]').setValue('retry-secret');
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    await flushPromises();
    expect(state.saveLiveBot).toHaveBeenCalledOnce();
    expect(state.startBot).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('does not duplicate a submitted start and retains external-wallet signing prompts', async () => {
    state.externalWallet.value = true;
    let finish!: () => void;
    state.startBot.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const wrapper = render();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', bot(), {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    await flushPromises();
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    expect(state.saveLiveBot).toHaveBeenCalledOnce();
    expect(state.startBot).toHaveBeenCalledOnce();
    expect(state.startBot).toHaveBeenCalledWith('review-bot', { expectedConnection: 'review-connection' });
    expect(wrapper.find('[data-testid="wallet-password"]').exists()).toBe(false);
    finish();
    await flushPromises();
    wrapper.unmount();
  });

  it('shows available and needed funds and blocks start until a read-only balance refresh passes', async () => {
    state.previewLiveFunding.mockResolvedValueOnce({
      sufficient: false,
      assets: [{ asset: bot().assetIn, requiredCodec: '100000000000000000000', availableCodec: '2000000000000000000' }],
    });
    const wrapper = render();
    wrapper
      .getComponent({ name: 'StrategyLab' })
      .vm.$emit('start', bot(), {}, completedResearch(), { genesisHash: 'genesis', denominator: '1' });
    await flushPromises();
    const funding = wrapper.get('[data-testid="review-funding"]');
    expect(funding.text()).toContain('100 XOR');
    expect(funding.text()).toContain('2 XOR');
    expect(funding.text()).toContain('bots.startFlow.fundingShort');
    expect(wrapper.find('[data-testid="wallet-password"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="consent-checkbox"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="authorize-start"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    expect(state.saveLiveBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="refresh-start-funding"]').trigger('click');
    await flushPromises();
    expect(state.previewLiveFunding).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="review-funding"]').text()).toContain('200 XOR');
    expect(wrapper.get('[data-testid="review-funding"]').text()).toContain('bots.startFlow.fundingReady');
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens shared subpages and restores the same view after remounting', async () => {
    await router.push('/bots/backtesting?strategy=sma');
    const wrapper = render();
    expect(wrapper.get('[data-testid="backtesting-tab"]').attributes('aria-current')).toBe('page');
    expect(wrapper.get('[data-testid="backtesting-tab"]').isVisible()).toBe(true);
    expect(wrapper.find('details, summary').exists()).toBe(false);
    expect(wrapper.getComponent({ name: 'BotPlayground' }).props('strategyPreset')).toBe('sma');
    expect(wrapper.get('[data-testid="strategy-lab-tab"]').attributes('href')).toBe('/bots/lab');
    wrapper.unmount();
    await router.push('/bots/backtesting?strategy=sma');
    const reopened = render();
    expect(reopened.getComponent({ name: 'BotPlayground' }).props('active')).toBe(true);
    expect(reopened.getComponent({ name: 'BotPlayground' }).props('strategyPreset')).toBe('sma');
    expect(state.createBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    reopened.unmount();
  });

  it('keeps Back and Forward navigation aligned with the visible workspace', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="backtesting-tab"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/bots/backtesting');
    await wrapper.get('[data-testid="your-bots-tab"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/bots/my-bots');
    router.back();
    await flushPromises();
    expect(wrapper.get('[data-testid="backtesting-tab"]').attributes('aria-current')).toBe('page');
    router.forward();
    await flushPromises();
    expect(wrapper.get('[data-testid="your-bots-tab"]').attributes('aria-current')).toBe('page');
    wrapper.unmount();
  });

  it('links composer and strategy choices without copying provider or draft data', async () => {
    await router.push('/bots/lab?panel=composer&strategy=threshold');
    const wrapper = render();
    const lab = wrapper.getComponent({ name: 'StrategyLab' });
    expect(lab.props()).toMatchObject({ composerOpen: true, strategyPreset: 'threshold' });
    lab.vm.$emit('navigate', { strategy: 'sma', composer: false });
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/bots/lab?strategy=sma');
    expect(state.startBot).not.toHaveBeenCalled();
    expect(state.createPaperBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('selects a linked local bot and chart without resuming its session', async () => {
    state.bots.value = [bot(), { ...bot('live'), id: 'bot-2', name: 'Second bot' }];
    state.selectedId.value = 'bot-1';
    await router.push('/bots/my-bots?bot=bot-2&chart=equity');
    const wrapper = render();
    expect(state.selectBot).toHaveBeenCalledWith('bot-2');
    expect(wrapper.get('.bot-toolbar h2').text()).toBe('Second bot');
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('bots.chartTabs.equity');
    await wrapper.findAll('.bot-row')[0].trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query).toEqual({ bot: 'bot-1', chart: 'equity' });
    expect(state.startBot).not.toHaveBeenCalled();
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('does not substitute another bot for a record absent from this browser', async () => {
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    await router.push('/bots/my-bots?bot=missing-bot');
    const wrapper = render();
    expect(wrapper.find('.bot-toolbar').exists()).toBe(false);
    expect(wrapper.findAll('.bot-row')).toHaveLength(1);
    expect(state.selectedId.value).toBe('');
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens the parallel strategy lab before bot setup and saves only after an explicit action', async () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="strategy-lab-tab"]').attributes('aria-current')).toBe('page');
    expect(wrapper.element.firstElementChild?.classList.contains('bots-top')).toBe(true);
    expect(wrapper.get('[data-testid="create-goal"]').isVisible()).toBe(true);
    const target = wrapper.get('[data-testid="bots-market-entry"]');
    expect(wrapper.getComponent({ name: 'StrategyLab' }).attributes('marketcontrolstarget')).toBe(
      `#${target.attributes('id')}`
    );
    expect(wrapper.get('.bots-workspace').isVisible()).toBe(false);
    expect(wrapper.findAll('[data-testid="new-bot"]').filter((button) => button.isVisible())).toHaveLength(0);
    expect(wrapper.find('[data-testid="browser-runtime-notice"]').exists()).toBe(false);
    expect(state.createBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    const template = bot();
    wrapper.getComponent({ name: 'StrategyLab' }).vm.$emit('save', template, { thresholdPercent: 10 });
    await flushPromises();
    expect(state.createPaperBot).toHaveBeenCalledWith(template, { thresholdPercent: 10 });
    expect(wrapper.get('[data-testid="your-bots-tab"]').attributes('aria-current')).toBe('page');
    expect(wrapper.get('[data-testid="browser-runtime-notice"]').text()).toBe('bots.uxWorkspace.browserNote');
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps existing running bot pause and stop controls visible from the playground', async () => {
    state.bots.value = [{ ...bot('live'), status: 'running' }];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    const actions = wrapper.get('.playground-sessions');
    expect(actions.isVisible()).toBe(true);
    await actions.findAll('button')[1].trigger('click');
    await flushPromises();
    expect(state.stopBot).toHaveBeenCalledWith('bot-1');
    wrapper.unmount();
  });

  it('reveals and focuses the new idle bot after the research handoff without starting it', async () => {
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = mount(BotsPage, {
      attachTo: document.body,
      global: {
        plugins: [router],
        stubs: { Teleport: true, BotPlayground: true, StrategyLab: true, QuantCommandCenter: true },
      },
    });
    const heading = wrapper.get<HTMLElement>('.bot-toolbar h2');
    const scroll = vi.fn();
    heading.element.scrollIntoView = scroll;
    const focus = vi.spyOn(heading.element, 'focus');
    const created = { ...bot(), id: 'created-bot', name: 'Reviewed strategy' };
    state.createPaperBot.mockImplementation(async () => {
      state.bots.value.push(created);
      state.selectedId.value = created.id;
    });
    wrapper.getComponent({ name: 'StrategyLab' }).vm.$emit('save', created, { thresholdPercent: 10 });
    await flushPromises();
    expect(wrapper.get('.bots-workspace').isVisible()).toBe(true);
    expect(heading.text()).toBe('Reviewed strategy');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(heading.element);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(state.selectedBot.value?.status).toBe('idle');
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('preserves research location when creating a paper bot fails', async () => {
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    const heading = wrapper.get<HTMLElement>('.bot-toolbar h2');
    const scroll = vi.fn();
    heading.element.scrollIntoView = scroll;
    const focus = vi.spyOn(heading.element, 'focus');
    state.createPaperBot.mockRejectedValue(new Error('bots.errors.config'));
    wrapper.getComponent({ name: 'StrategyLab' }).vm.$emit('save', bot(), { thresholdPercent: 10 });
    await flushPromises();
    expect(wrapper.get('[data-testid="strategy-lab-tab"]').attributes('aria-current')).toBe('page');
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('pauses the strategy inspector when switching away from its tab', async () => {
    const wrapper = render();
    expect(wrapper.findComponent({ name: 'BotPlayground' }).exists()).toBe(false);
    await wrapper.get('[data-testid="backtesting-tab"]').trigger('click');
    await flushPromises();
    const playground = wrapper.getComponent({ name: 'BotPlayground' });
    expect(playground.props('active')).toBe(true);
    await wrapper.get('[data-testid="strategy-lab-tab"]').trigger('click');
    await flushPromises();
    expect(playground.props('active')).toBe(false);
    await wrapper.get('[data-testid="backtesting-tab"]').trigger('click');
    await flushPromises();
    expect(playground.props('active')).toBe(true);
    wrapper.unmount();
  });

  it('creates a bot through the paper-only draft without requesting wallet credentials', async () => {
    const wrapper = render();
    expect(wrapper.text()).toContain('bots.emptyTitle');
    await wrapper.get('[data-testid="your-bots-tab"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-testid="new-bot"]').filter((button) => button.isVisible())).toHaveLength(1);
    await wrapper.get('[data-testid="new-bot"]').trigger('click');
    expect(wrapper.get('[data-testid="create-form"]').text()).toContain('bots.uxWorkspace.paperSimulation');
    expect(wrapper.get('[data-testid="allocation"]').element.parentElement?.textContent).toContain('XOR');
    await wrapper.get('[data-testid="bot-name"]').setValue('Patient accumulator');
    await wrapper.get('[data-testid="allocation"]').setValue('12.000000000000000001');
    await wrapper.get('[data-testid="create-form"]').trigger('submit');
    await flushPromises();
    expect(state.createBot).toHaveBeenCalledWith({
      name: 'Patient accumulator',
      assetInAddress: 'xor',
      assetOutAddress: 'val',
      allocation: '12.000000000000000001',
      feeBudget: '1',
      strategyKind: 'dca',
    });
    expect(state.startBot).not.toHaveBeenCalled();
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows exact holdings and chart-derived performance without token floating-point arithmetic', async () => {
    const precise = bot();
    precise.portfolio.holdings.xor = '100000000000000000001';
    precise.equity = [
      { timestamp: 1, value: '100', benchmark: '100' },
      { timestamp: 2, value: '110', benchmark: '100' },
      { timestamp: 3, value: '99.000000000000000001', benchmark: '100' },
    ];
    state.bots.value = [precise];
    state.selectedId.value = precise.id;
    const wrapper = render();
    expect(wrapper.get('.holdings-list').text()).toContain('100.000000000000000001');
    expect(wrapper.get('.metrics-strip').text()).toContain('-0.999999999999999999');
    expect(wrapper.get('.metrics-strip').text()).toContain('9.99');
    wrapper.unmount();
  });

  it('keeps Stop usable while the controller is busy with a provider or backtest', async () => {
    const running = bot('live');
    running.status = 'running';
    state.bots.value = [running];
    state.selectedId.value = running.id;
    state.busy.value = true;
    state.sessionActiveIds.value = [running.id];
    const wrapper = render();
    expect(wrapper.get('[data-testid="stop"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="stop"]').trigger('click');
    await flushPromises();
    expect(state.stopBot).toHaveBeenCalledWith(running.id);
    wrapper.unmount();
  });

  it('allows cancelling session authority from a pending consent dialog', async () => {
    state.bots.value = [bot('live')];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    await wrapper.get('[data-testid="start"]').trigger('click');
    await wrapper.get('[data-testid="wallet-password"]').setValue('never-store-this');
    state.busy.value = true;
    await flushPromises();
    await wrapper.get('[data-testid="stop-pending"]').trigger('click');
    await flushPromises();
    expect(state.stopBot).toHaveBeenCalledWith('bot-1');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('starts paper mode without requesting a password or consent', async () => {
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    await wrapper.get('[data-testid="start"]').trigger('click');
    await flushPromises();
    expect(state.startBot).toHaveBeenCalledWith('bot-1', {});
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('requires explicit live consent and erases the password after a failed start', async () => {
    state.bots.value = [bot('live')];
    state.selectedId.value = 'bot-1';
    state.startBot.mockRejectedValue(new Error('bots.errors.password'));
    const wrapper = render();
    await wrapper.get('[data-testid="start"]').trigger('click');
    expect(state.startBot).not.toHaveBeenCalled();
    expect(wrapper.get('[role="dialog"]').text()).toContain('bots.allowedPair');
    expect(wrapper.get('[data-testid="consent-browser-notice"]').text()).toBe('bots.uxWorkspace.browserNote');
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    expect(state.startBot).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="wallet-password"]').setValue('session-secret');
    await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    await flushPromises();
    expect(state.startBot).toHaveBeenCalledWith('bot-1', { password: 'session-secret' });
    expect((wrapper.get('[data-testid="wallet-password"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.text()).not.toContain('session-secret');
    wrapper.unmount();
  });

  it('shows a running session only when this tab holds active authority', async () => {
    const running = { ...bot(), status: 'running' as const };
    state.bots.value = [running];
    state.selectedId.value = running.id;
    const wrapper = render();
    const status = wrapper.get('[data-testid="bot-runtime-status"]');
    expect(status.classes()).toContain('paused');
    expect(status.text()).toContain('bots.uxWorkspace.sessionInactive');
    state.sessionActiveIds.value = [running.id];
    await flushPromises();
    expect(status.classes()).toContain('running');
    expect(status.text()).toContain('bots.uxWorkspace.paperRunning');
    state.bots.value[0].mode = 'live';
    await flushPromises();
    expect(status.text()).toContain('bots.uxWorkspace.liveRunning');
    wrapper.unmount();
  });

  it.each(['offline'] as const)('keeps the observed %s pause reason after the browser recovers', async (reason) => {
    const running = { ...bot(), status: 'running' as const };
    state.bots.value = [running];
    state.selectedId.value = running.id;
    state.sessionActiveIds.value = [running.id];
    const wrapper = render();
    const status = wrapper.get('[data-testid="bot-runtime-status"]');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    state.sessionActiveIds.value = [];
    state.bots.value[0].status = 'paused';
    await flushPromises();
    expect(status.classes()).toContain('paused');
    expect(status.text()).toContain(`bots.uxWorkspace.${reason}`);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(status.text()).toContain(`bots.uxWorkspace.${reason}Resume`);
    expect(state.startBot).not.toHaveBeenCalled();
    state.bots.value[0].status = 'running';
    state.sessionActiveIds.value = [running.id];
    await flushPromises();
    expect(status.text()).toContain('bots.uxWorkspace.paperRunning');
    wrapper.unmount();
  });

  it('explains idle, manual pause, attention and stopped states independently of browser interruptions', async () => {
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    const status = wrapper.get('[data-testid="bot-runtime-status"]');
    expect(status.text()).toContain('bots.uxWorkspace.paperReady');
    state.bots.value[0].mode = 'live';
    await flushPromises();
    expect(status.text()).toContain('bots.uxWorkspace.liveReady');
    state.bots.value[0].status = 'paused';
    state.bots.value[0].activity = [{ id: 'pause', kind: 'status', timestamp: 1, message: 'bots.events.paused' }];
    await flushPromises();
    expect(status.text()).toContain('bots.uxWorkspace.manualPause');
    for (const next of ['attention', 'stopped'] as const) {
      state.bots.value[0].status = next;
      await flushPromises();
      expect(status.text()).toContain(`bots.uxWorkspace.${next}`);
    }
    wrapper.unmount();
  });

  it('updates strategy explanations and capital units before creating a paper bot', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="your-bots-tab"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="new-bot"]').trigger('click');
    for (const kind of ['dca', 'threshold', 'sma', 'ai']) {
      await wrapper.get('[data-testid="draft-strategy"]').setValue(kind);
      expect(wrapper.get('[data-testid="draft-strategy-explanation"]').text()).toContain(
        `bots.uxWorkspace.strategyDescriptions.${kind}`
      );
    }
    await wrapper.get('[data-testid="asset-in"]').setValue('val');
    expect(wrapper.get('[data-testid="allocation"]').element.parentElement?.textContent).toContain('VAL');
    expect(state.createBot).not.toHaveBeenCalled();
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps external-wallet consent but never asks for the existing wallet password', async () => {
    state.bots.value = [bot('live')];
    state.selectedId.value = 'bot-1';
    state.externalWallet.value = true;
    const wrapper = render();
    await wrapper.get('[data-testid="start"]').trigger('click');
    expect(wrapper.find('[data-testid="wallet-password"]').exists()).toBe(false);
    expect(wrapper.get('[role="dialog"]').text()).toContain('bots.externalSigning');
    await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
    await wrapper.get('[data-testid="consent-form"]').trigger('submit');
    await flushPromises();
    expect(state.startBot).toHaveBeenCalledWith('bot-1', {});
    wrapper.unmount();
  });

  it('offers consent-based resume for a persisted running bot with no session in this tab', async () => {
    const persisted = bot('live');
    persisted.status = 'running';
    state.bots.value = [persisted];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    expect(wrapper.get('[data-testid="start"]').text()).toBe('bots.resume');
    await wrapper.get('[data-testid="start"]').trigger('click');
    expect(wrapper.find('[data-testid="consent-form"]').exists()).toBe(true);
    expect(state.startBot).not.toHaveBeenCalled();
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('discovers current provider models, persists only selected metadata and transfers the credential closure', async () => {
    const ai = bot();
    ai.strategy.kind = 'ai';
    state.bots.value = [ai];
    state.selectedId.value = ai.id;
    const wrapper = render();
    expect(wrapper.find('input[maxlength="120"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="editor-model"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="editor-load-models"]').trigger('click');
    await wrapper.get('[data-testid="provider-key"]').setValue('private-provider-key');
    await wrapper.get('[data-testid="provider-form"]').trigger('submit');
    await flushPromises();
    expect(mocks.createAi).toHaveBeenCalledWith('openai', { apiKey: 'private-provider-key', model: '', endpoint: '' });
    expect(client.listModels).toHaveBeenCalledOnce();
    expect(wrapper.find('[data-testid="provider-key"]').exists()).toBe(false);
    expect(
      wrapper
        .get('[data-testid="provider-model"]')
        .findAll('option')
        .map((option) => option.attributes('value'))
    ).toEqual(['current-model', 'other-model']);
    expect(state.connectProviderClient).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="provider-model"]').setValue('other-model');
    await wrapper.get('[data-testid="provider-form"]').trigger('submit');
    await flushPromises();
    expect(client.selectModel).toHaveBeenLastCalledWith('other-model');
    expect(state.updateBot).toHaveBeenCalledWith({ ...ai, model: 'other-model' });
    expect(JSON.stringify(state.updateBot.mock.calls)).not.toContain('private-provider-key');
    expect(state.connectProviderClient).toHaveBeenCalledWith(
      'bot-1',
      client,
      {
        provider: 'openai',
        model: 'other-model',
        endpoint: '',
      },
      expect.any(AbortSignal)
    );
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.unmount();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('clears failed model-discovery keys and offers retry without an invented model list', async () => {
    const ai = bot();
    ai.strategy.kind = 'ai';
    state.bots.value = [ai];
    state.selectedId.value = ai.id;
    vi.mocked(client.listModels).mockRejectedValue(new Error('provider body must not reach UI'));
    const wrapper = render();
    await wrapper.get('[data-testid="editor-load-models"]').trigger('click');
    await wrapper.get('[data-testid="provider-key"]').setValue('private-provider-key');
    await wrapper.get('[data-testid="provider-form"]').trigger('submit');
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('[data-testid="provider-key"]').element.value).toBe('');
    expect(wrapper.text()).toContain('bots.labAi.modelsUnavailable');
    expect(wrapper.text()).not.toContain('provider body must not reach UI');
    expect(client.disconnect).toHaveBeenCalled();
    expect(state.updateBot).not.toHaveBeenCalled();
    expect(state.connectProviderClient).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('revokes cancelled discovery and ignores late models after provider changes', async () => {
    const ai = bot();
    ai.strategy.kind = 'ai';
    state.bots.value = [ai];
    state.selectedId.value = ai.id;
    let resolve!: (models: BotAiModel[]) => void;
    vi.mocked(client.listModels).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const wrapper = render();
    await wrapper.get('[data-testid="editor-load-models"]').trigger('click');
    await wrapper.get('[data-testid="provider-key"]').setValue('private-provider-key');
    await wrapper.get('[data-testid="provider-form"]').trigger('submit');
    await wrapper.get('[data-testid="editor-provider"]').setValue('claude');
    expect(client.disconnect).toHaveBeenCalled();
    expect(vi.mocked(client.listModels).mock.calls[0][0]?.aborted).toBe(true);
    resolve([{ id: 'stale-model', name: 'Must not appear', createdAt: 1 }]);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Must not appear');
    expect(state.connectProviderClient).not.toHaveBeenCalled();
    expect(wrapper.get<HTMLSelectElement>('[data-testid="editor-model"]').element.value).toBe('');
    wrapper.unmount();
  });

  it.each(['dca', 'threshold', 'ai'] as const)(
    'clears SMA-only timing when explicitly changing the editor to %s, while unrelated edits preserve it',
    async (kind) => {
      const existing = bot();
      existing.strategy.kind = 'sma';
      existing.strategy.signalTiming = 'live-price';
      state.bots.value = [existing];
      state.selectedId.value = existing.id;
      const wrapper = render();
      await wrapper.get('[data-testid="bot-interval-blocks"]').setValue('10');
      await wrapper.get('.bot-inspector form').trigger('submit');
      await flushPromises();
      expect(state.updateBot.mock.calls.at(-1)?.[0].strategy).toMatchObject({
        kind: 'sma',
        signalTiming: 'live-price',
        intervalMs: 60000,
      });
      await wrapper.get('[data-testid="editor-strategy"]').setValue(kind);
      await wrapper.get('.bot-inspector form').trigger('submit');
      await flushPromises();
      const changed = state.updateBot.mock.calls.at(-1)?.[0].strategy;
      expect(changed.kind).toBe(kind);
      expect(changed).not.toHaveProperty('signalTiming');
      expect(existing.strategy).toMatchObject({ kind: 'sma', signalTiming: 'live-price', intervalMs: 3600000 });
      expect(state.startBot).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it('shows saved hourly cadence in blocks and saves an explicit one-block cadence as six seconds', async () => {
    const existing = bot();
    state.bots.value = [existing];
    state.selectedId.value = existing.id;
    const wrapper = render();
    const cadence = wrapper.get<HTMLInputElement>('[data-testid="bot-interval-blocks"]');
    expect(cadence.element.value).toBe('600');
    await wrapper.get('.bot-inspector form').trigger('submit');
    await flushPromises();
    expect(state.updateBot.mock.calls.at(-1)?.[0].strategy.intervalMs).toBe(3600000);
    await cadence.setValue('1');
    await wrapper.get('.bot-inspector form').trigger('submit');
    await flushPromises();
    expect(state.updateBot.mock.calls.at(-1)?.[0].strategy.intervalMs).toBe(6000);
    wrapper.unmount();
  });

  it('preserves non-aligned saved durations unless edited and rejects fractional or zero block edits', async () => {
    const existing = bot();
    existing.strategy.intervalMs = 6501;
    state.bots.value = [existing];
    state.selectedId.value = existing.id;
    const wrapper = render();
    await wrapper.get('.bot-inspector form').trigger('submit');
    await flushPromises();
    expect(state.updateBot.mock.calls.at(-1)?.[0].strategy.intervalMs).toBe(6501);
    state.updateBot.mockClear();
    for (const value of ['0', '1.5']) {
      await wrapper.get('[data-testid="bot-interval-blocks"]').setValue(value);
      await wrapper.get('.bot-inspector form').trigger('submit');
      await flushPromises();
      expect(state.updateBot).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('bots.errors.config');
    }
    wrapper.unmount();
  });

  it('requires review before applying an AI-generated historical strategy', async () => {
    const ai = bot();
    ai.strategy.kind = 'ai';
    state.bots.value = [ai];
    state.selectedId.value = ai.id;
    state.providerConnectedIds.value = [ai.id];
    const wrapper = render();
    await wrapper.get('[data-testid="suggest-strategy"]').trigger('click');
    await flushPromises();
    expect(state.suggestStrategy).toHaveBeenCalledWith('bot-1');
    expect(state.updateBot).not.toHaveBeenCalled();
    expect(wrapper.get('[role="dialog"]').text()).toContain('bots.strategies.threshold');
    await wrapper.get('[role="dialog"] .primary').trigger('click');
    await flushPromises();
    expect(state.updateBot).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: expect.objectContaining({ kind: 'threshold', threshold: '2' }) })
    );
    expect(state.startBot).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('passes historical assumptions to the backtest adapter without invoking live execution', async () => {
    const history = {
      candles: [{ timestamp: Date.UTC(2026, 2, 1, 1), close: '2' }],
      missing: 0,
      denominationVerified: true,
      identity: { genesisHash: 'sora', denominator: '1000' },
    };
    mocks.loadHistory.mockResolvedValueOnce(history);
    mocks.loadFees.mockResolvedValueOnce({
      networkFeeXor: '0.100020612589707326',
      swapFeePercent: '0.6',
      sellNetworkFeeXor: '0.200020612589707326',
      sellSwapFeePercent: '0.7',
      priceImpactPercent: '1.25',
      sellPriceImpactPercent: '2.5',
      expiresAt: Date.now() + 60_000,
      genesisHash: 'sora',
      denominator: '1000',
    });
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    await wrapper.get('[data-testid="backtest"]').trigger('click');
    await wrapper.get('[data-testid="backtest-form"]').trigger('submit');
    await flushPromises();
    expect(state.backtestBot).toHaveBeenCalledWith('bot-1', {
      days: 30,
      interval: 'hour',
      slippagePercent: '0.5',
      feeAmount: '0.100020612589707326',
      swapFeePercent: '0.6',
      sellFeeAmount: '0.200020612589707326',
      sellSwapFeePercent: '0.7',
      priceImpactPercent: '1.25',
      sellPriceImpactPercent: '2.5',
      history,
    });
    expect(state.startBot).not.toHaveBeenCalled();
    expect(mocks.loadHistory).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ historyStartAt: Date.UTC(2026, 2, 1) })
    );
    wrapper.unmount();
  });

  it('does not run a saved bot backtest when current chain fees cannot be verified', async () => {
    mocks.loadFees.mockRejectedValueOnce(new Error('bots.errors.quote'));
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    await wrapper.get('[data-testid="backtest"]').trigger('click');
    await wrapper.get('[data-testid="backtest-form"]').trigger('submit');
    await flushPromises();
    expect(state.backtestBot).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('bots.errors.quote');
    wrapper.unmount();
  });
  it('rejects legacy history and current fees from different finalized denomination identities', async () => {
    mocks.loadFees.mockResolvedValueOnce({ genesisHash: 'sora', denominator: '1000', expiresAt: Date.now() + 60_000 });
    mocks.loadHistory.mockResolvedValueOnce({ identity: { genesisHash: 'sora', denominator: '1' } });
    state.bots.value = [bot()];
    state.selectedId.value = 'bot-1';
    const wrapper = render();
    await wrapper.get('[data-testid="backtest"]').trigger('click');
    await wrapper.get('[data-testid="backtest-form"]').trigger('submit');
    await flushPromises();
    expect(state.backtestBot).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('bots.errors.denomination');
    wrapper.unmount();
  });

  /** Complete only the new navigation cases' controller contract while mounting the real Discovery UI. */
  function installNavigationCampaignController() {
    const campaigns = {
      discoveryCampaigns: ref([]),
      prepareDiscoveryCampaign: vi.fn(async () => {
        throw new Error('Unexpected discovery preparation during watch navigation');
      }),
      startDiscoveryCampaign: vi.fn(async () => {
        throw new Error('Unexpected discovery authorization during watch navigation');
      }),
      prepareDiscoveryCampaignResume: vi.fn(async () => {
        throw new Error('Unexpected discovery resume preparation during watch navigation');
      }),
      pauseDiscoveryCampaign: vi.fn(async () => {
        throw new Error('Unexpected discovery pause during watch navigation');
      }),
      closeDiscoveryCampaign: vi.fn(async () => {
        throw new Error('Unexpected discovery close during watch navigation');
      }),
      readDiscoveryCampaignOrders: vi.fn(async (): Promise<BotOrder[]> => []),
    };
    Object.assign(state, campaigns);
    return campaigns;
  }

  /** Seed only validated public recovery for the route boundary; no assistant or wallet authority is supplied. */
  function seedNavigationWatch(): string {
    const now = Date.parse('2026-09-26T00:45:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const genesis = `0x${'ab'.repeat(32)}`;
    const network = JSON.stringify([true, genesis, 'wss://node', 130]);
    const identity = JSON.stringify([true, 'tc1-public-address', 'polkadot-js', true, genesis, 'wss://node', 130]);
    const checkpoint: AutopilotWatchCheckpoint = {
      version: 1,
      savedAt: now - 3_600_000,
      identity,
      network,
      assistantKind: 'desktop',
      input: {
        assetInAddress: KUSD.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        maxLossPercent: '10',
        targetReturnPercent: '5',
        title: 'Maximize XOR',
        valuationAsset: 'output',
      },
      lastAttemptedCompletedThrough: now - 45 * 60_000,
    };
    checkpoint.trainingDiagnostics = copyAutopilotTrainingWatchDiagnostics(
      { stage: 'training', failures: [{ candidate: 1, reasons: ['netLoss'] }] },
      checkpoint.lastAttemptedCompletedThrough,
      checkpoint
    )!;
    expect(writeAutopilotWatchCheckpoint(checkpoint)).toBe(true);
    state.assets.value = [KUSD, XOR];
    state.connectionIdentity.value = identity;
    state.readConnectionIdentity.mockImplementation(() => state.connectionIdentity.value);
    state.readNetworkIdentity.mockReturnValue(network);
    (mocks.connection as { soraAddress: ReturnType<typeof ref<string>> }).soraAddress.value = 'tc1-public-address';
    return sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!;
  }

  it.each(['lab', 'discover', 'backtesting', 'my-bots'] as const)(
    'keeps the exact paused watch when the user visits %s and returns to AI trading',
    async (section) => {
      await router.push('/bots');
      const campaigns = installNavigationCampaignController();
      const stored = seedNavigationWatch();
      const wrapper = render();
      try {
        await flushPromises();
        expect(wrapper.find('[data-testid="autopilot-watch-resume"]').exists()).toBe(true);
        if (section === 'lab') await wrapper.get('[data-testid="autopilot-advanced"]').trigger('click');
        else await router.push(`/bots/${section}`);
        await flushPromises();
        expect(router.currentRoute.value.params.section).toBe(section);
        expect(wrapper.find('[data-testid="autopilot"]').exists()).toBe(false);
        if (section === 'discover') {
          const discovery = wrapper.getComponent({ name: 'BotDiscovery' });
          expect(wrapper.get('[data-testid="bot-discovery"]').isVisible()).toBe(true);
          expect(discovery.props('campaigns')).toEqual([]);
          expect(discovery.props('prepare')).toBe(campaigns.prepareDiscoveryCampaign);
          expect(discovery.props('authorize')).toBe(campaigns.startDiscoveryCampaign);
          expect(discovery.props('prepareResume')).toBe(campaigns.prepareDiscoveryCampaignResume);
          expect(discovery.props('pauseCampaign')).toBe(campaigns.pauseDiscoveryCampaign);
          expect(discovery.props('closeCampaign')).toBe(campaigns.closeDiscoveryCampaign);
          expect(discovery.props('readCampaignOrders')).toBe(campaigns.readDiscoveryCampaignOrders);
        }
        expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);

        await router.push('/bots');
        await flushPromises();
        expect(wrapper.get('[data-testid="autopilot-watch-owner"]').text()).toBe('tc1-public-address');
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
        expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-in"]').element.value).toBe(KUSD.address);
        expect(wrapper.get<HTMLSelectElement>('[data-testid="autopilot-asset-out"]').element.value).toBe(XOR.address);
        expect(wrapper.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeUndefined();
        expect(wrapper.get('[data-testid="autopilot-diagnostics"]').text()).toContain(
          'bots.autopilot.diagnostics.netLoss'
        );
        expect(wrapper.find('[data-testid="autopilot-watching"]').exists()).toBe(false);
        expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
        expect(mocks.createAi).not.toHaveBeenCalled();
        expect(mocks.loadHistory).not.toHaveBeenCalled();
        expect(state.prepareLiveBot).not.toHaveBeenCalled();
        expect(state.saveLiveBot).not.toHaveBeenCalled();
        expect(state.createBot).not.toHaveBeenCalled();
        expect(state.resetGoal).not.toHaveBeenCalled();
        expect(state.startBot).not.toHaveBeenCalled();
        expect(campaigns.prepareDiscoveryCampaign).not.toHaveBeenCalled();
        expect(campaigns.startDiscoveryCampaign).not.toHaveBeenCalled();
        expect(campaigns.prepareDiscoveryCampaignResume).not.toHaveBeenCalled();
        expect(campaigns.pauseDiscoveryCampaign).not.toHaveBeenCalled();
        expect(campaigns.closeDiscoveryCampaign).not.toHaveBeenCalled();
        expect(campaigns.readDiscoveryCampaignOrders).not.toHaveBeenCalled();
      } finally {
        wrapper.unmount();
      }
    }
  );

  it('retains paused recovery through the real leave guard and a fresh Bots mount on return', async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        ...botTradingRoutes.map((route) => ({ ...route, component: BotsPage })),
        { path: '/outside', component: { template: '<div data-testid="outside-route">Outside</div>' } },
      ],
    });
    await router.push('/bots');
    await router.isReady();
    const campaigns = installNavigationCampaignController();
    const stored = seedNavigationWatch();
    const wrapper = mount(
      { template: '<router-view />' },
      {
        global: {
          plugins: [router],
          stubs: { Teleport: true, BotPlayground: true, StrategyLab: true, QuantCommandCenter: true },
        },
      }
    );
    try {
      await flushPromises();
      expect(wrapper.find('[data-testid="autopilot-watch-resume"]').exists()).toBe(true);

      await router.push('/outside');
      await flushPromises();
      expect(wrapper.find('[data-testid="outside-route"]').exists()).toBe(true);
      expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
      await router.push('/bots');
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
      expect(wrapper.get('[data-testid="autopilot-watch-resume"]').attributes('disabled')).toBeUndefined();
      expect(wrapper.find('[data-testid="autopilot-watching"]').exists()).toBe(false);
      expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
      expect(mocks.createAi).not.toHaveBeenCalled();
      expect(mocks.loadHistory).not.toHaveBeenCalled();
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      expect(state.saveLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
      expect(campaigns.prepareDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.startDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.prepareDiscoveryCampaignResume).not.toHaveBeenCalled();
      expect(campaigns.pauseDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.closeDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.readDiscoveryCampaignOrders).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('still discards navigation-retained recovery on the visible Stop watching action', async () => {
    await router.push('/bots');
    const campaigns = installNavigationCampaignController();
    seedNavigationWatch();
    const wrapper = render();
    try {
      await flushPromises();
      await wrapper.get('[data-testid="autopilot-advanced"]').trigger('click');
      await flushPromises();
      await router.push('/bots');
      await flushPromises();
      await wrapper.get('[data-testid="autopilot-watch-stop"]').trigger('click');
      await flushPromises();

      expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
      expect(wrapper.find('[data-testid="autopilot-watch-resume"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="autopilot-go"]').exists()).toBe(true);
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
      expect(campaigns.prepareDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.startDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.prepareDiscoveryCampaignResume).not.toHaveBeenCalled();
      expect(campaigns.pauseDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.closeDiscoveryCampaign).not.toHaveBeenCalled();
      expect(campaigns.readDiscoveryCampaignOrders).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('localizes the precise impact cause in both paused recovery and the resumed unsigned watch', async () => {
    const localizedCause = 'The price impact has exceeded the selected value';
    mocks.translate.mockImplementation((key: string) =>
      key === AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE ? localizedCause : key
    );
    await router.push('/bots');
    const checkpoint = JSON.parse(seedNavigationWatch()) as AutopilotWatchCheckpoint;
    delete checkpoint.trainingDiagnostics;
    const failure = copyAutopilotWatchFailure(
      AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
      checkpoint.lastAttemptedCompletedThrough,
      checkpoint,
      { stage: 'preflight', cause: 'priceImpact', sampleCount: 5 }
    );
    expect(failure).not.toBeNull();
    checkpoint.lastFailure = failure!;
    expect(writeAutopilotWatchCheckpoint(checkpoint)).toBe(true);
    // This page case exercises rendering and the real portable mailbox, not IndexedDB or new research.
    const exposureStore = {
      read: vi.fn(async () => null),
      reserve: vi.fn(async () => {
        throw new Error('Unexpected validation reservation while resuming a watch');
      }),
      saveDiagnostics: vi.fn(async () => {
        throw new Error('Unexpected validation write while resuming a watch');
      }),
    };
    vi.spyOn(autopilotExposure, 'createAutopilotValidationExposureStore').mockReturnValue(exposureStore);
    const wrapper = render();
    try {
      await flushPromises();
      const saved = wrapper.get('[data-testid="autopilot-watch-saved-error"]');
      expect(saved.text()).toContain(localizedCause);
      expect(saved.text()).not.toContain(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE);
      await wrapper.get('[data-testid="autopilot-watch-resume"]').trigger('click');
      await flushPromises();
      const connectionId = wrapper.findComponent({ name: 'BotAutopilot' }).props('desktopConnectionId');
      expect(connectionId).toEqual(expect.any(String));
      expect(connectionId).not.toBe('');
      await wrapper.get('[data-testid="autopilot-agent-connection-id"]').setValue(connectionId);
      await wrapper.get('[data-testid="autopilot-agent-acknowledge"]').trigger('click');
      await flushPromises();
      await wrapper.get('[data-testid="autopilot-watch-resume"]').trigger('click');
      await flushPromises();
      expect(wrapper.get('[data-testid="autopilot-watching"]').exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'BotAutopilot' }).props('error')).toBe(localizedCause);
      const active = wrapper.get('[data-testid="autopilot-watch-error"]');
      expect(active.text()).toContain(localizedCause);
      expect(active.text()).not.toContain(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE);
      const retained = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
      expect(retained.lastFailure).toEqual(failure);
      expect(exposureStore.read).toHaveBeenCalledOnce();
      expect(exposureStore.reserve).not.toHaveBeenCalled();
      expect(exposureStore.saveDiagnostics).not.toHaveBeenCalled();
      expect(mocks.loadHistory).not.toHaveBeenCalled();
      expect(mocks.loadFees).not.toHaveBeenCalled();
      expect(mocks.createAi).not.toHaveBeenCalled();
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      expect(state.saveLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it.each([
    'historyErrorMessages.liquidityproxy.slippagenottolerated.extra',
    'historyErrorMessages.liquidityproxy.SecretProviderResponse',
    '<img src=x onerror="provider()">',
  ])('does not broaden recognized errors or translation to %s', async (value) => {
    expect(isAutopilotErrorKey(value)).toBe(false);
    mocks.translate.mockImplementation((key: string) =>
      key.startsWith('historyErrorMessages.') ? 'Unexpected broad translation' : key
    );
    state.error.value = value;
    const wrapper = render();
    try {
      await flushPromises();
      expect(wrapper.get('.bots-error').text()).toBe(value);
      expect(wrapper.get('.bots-error').find('img').exists()).toBe(false);
      expect(mocks.translate).not.toHaveBeenCalledWith(value);
      expect(state.startBot).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  describe('Quant Loop command center', () => {
    /** A researched rules bot as the command center emits it: 10 XOR budget, 3 XOR orders. */
    function quantPayload() {
      const template = bot();
      template.name = 'VAL liquidity harvester';
      template.strategy = {
        ...template.strategy,
        kind: 'rules',
        amount: '3',
        intervalMs: 6_000,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 48, direction: 'below', threshold: '-15' }],
          },
          exit: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 48, direction: 'above', threshold: '10' }],
          },
        },
      };
      template.policy = {
        ...template.policy,
        maxPriceImpactPercent: '16',
        feeBudgetCodec: '2000000000000000000',
        sessionDurationMs: 7 * 86_400_000,
      };
      template.portfolio = {
        initial: { xor: '10000000000000000000', val: '0' },
        holdings: { xor: '10000000000000000000', val: '0' },
        feesPaidCodec: '0',
        trades: 0,
      };
      const research: BotResearchSnapshot = {
        version: 1,
        source: 'historical',
        testedAt: 3,
        startAt: 1,
        endAt: 2,
        coverage: 1,
        validation: 'walk-forward',
        trainPercent: 50,
        folds: 4,
        optimized: true,
        returnPercent: '43.49',
        drawdownPercent: '33.72',
        trades: 37,
        networkFeeXor: '0.1',
        swapFeePercent: '0.6',
      };
      return {
        bot: template,
        settings: {},
        research,
        denomination: { genesisHash: 'genesis', denominator: '1' },
        sessionDurationMs: 7 * 86_400_000,
        cadence: { episodes: 5, daysPerEpisode: 20.2, holdHours: { min: 26, max: 164 }, lastEntryAt: 1 },
      };
    }

    it('renders the research above the AI goal flow with the real fee and history loaders', async () => {
      await router.push('/bots');
      const wrapper = render();
      const center = wrapper.getComponent({ name: 'QuantCommandCenter' });
      expect(center.props('assets')).toEqual([bot().assetIn, bot().assetOut]);
      expect(center.props('loadFees')).toBe(mocks.loadFees);
      expect(center.props('loadHistory')).toBe(mocks.loadHistory);
      const html = wrapper.html();
      expect(html.indexOf('quant-command-center-stub')).toBeLessThan(html.indexOf('data-testid="autopilot"'));
      await router.push('/bots/lab');
      await flushPromises();
      expect(wrapper.findComponent({ name: 'QuantCommandCenter' }).exists()).toBe(false);
      wrapper.unmount();
    });

    it('opens the one-glance live review without signing until explicit consent', async () => {
      mocks.translate.mockImplementation((key: string, params?: Record<string, unknown>) =>
        params ? `${key} ${JSON.stringify(params)}` : key
      );
      await router.push('/bots');
      const wrapper = render();
      const payload = quantPayload();
      wrapper.getComponent({ name: 'QuantCommandCenter' }).vm.$emit('live', payload);
      await flushPromises();
      expect(state.prepareLiveBot).toHaveBeenCalledWith(payload.bot, payload.research, payload.denomination, {
        sessionDurationMs: 7 * 86_400_000,
      });
      const summary = wrapper.get('[data-testid="quant-consent"]');
      expect(summary.text()).toContain('bots.quant.consent.title {"symbol":"VAL"}');
      expect(summary.text()).toContain('bots.quant.consent.budget {"amount":"10"}');
      expect(summary.text()).toContain('bots.quant.consent.order {"amount":"3"}');
      expect(summary.text()).toContain('bots.quant.consent.reserve {"amount":"2"}');
      expect(summary.text()).toContain('bots.quant.consent.impact {"value":"16"}');
      expect(summary.text()).toContain('"return":"43.49","drawdown":"33.72","trades":37');
      expect(wrapper.get('[data-testid="quant-consent-session"]').text()).toBe(
        'bots.quant.consent.sessionDays {"count":7}'
      );
      expect(wrapper.get('[data-testid="quant-consent-cadence"]').text()).toBe(
        'bots.quant.consent.cadenceDays {"days":20.2,"hold":7}'
      );
      expect(wrapper.get('[data-testid="review-limits"]').isVisible()).toBe(true);
      expect(wrapper.find('[data-testid="quant-get-xor"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="wallet-password"]').exists()).toBe(true);
      expect(wrapper.get('[data-testid="authorize-start"]').attributes('disabled')).toBeDefined();
      expect(state.saveLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
      await wrapper.get('[data-testid="wallet-password"]').setValue('local-secret');
      await wrapper.get('[data-testid="consent-checkbox"]').setValue(true);
      await wrapper.get('[data-testid="consent-form"]').trigger('submit');
      await flushPromises();
      expect(state.saveLiveBot).toHaveBeenCalledTimes(1);
      expect(state.startBot).toHaveBeenCalledWith('review-bot', expect.objectContaining({ password: 'local-secret' }));
      wrapper.unmount();
    });

    it('links to Buy XOR when the wallet cannot fund the selected bot', async () => {
      router.addRoute({ path: '/buy-xor', name: 'BuyXor', component: {} });
      state.previewLiveFunding.mockResolvedValueOnce({
        sufficient: false,
        assets: [
          { asset: bot().assetIn, requiredCodec: '10000000000000000000', availableCodec: '1000000000000000000' },
        ],
      });
      await router.push('/bots');
      const wrapper = render();
      wrapper.getComponent({ name: 'QuantCommandCenter' }).vm.$emit('live', quantPayload());
      await flushPromises();
      expect(wrapper.get('[data-testid="quant-get-xor"]').attributes('href')).toContain('/buy-xor');
      expect(wrapper.find('[data-testid="wallet-password"]').exists()).toBe(false);
      expect(state.startBot).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('saves paper bots through the existing research path and opens Swap prefilled', async () => {
      router.addRoute({ path: '/swap/:first?/:second?', name: 'Swap', component: {} });
      await router.push('/bots');
      const wrapper = render();
      const payload = quantPayload();
      wrapper.getComponent({ name: 'QuantCommandCenter' }).vm.$emit('paper', payload);
      await flushPromises();
      expect(state.createPaperBot).toHaveBeenCalledWith(
        payload.bot,
        expect.objectContaining({ research: payload.research })
      );
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      // Saving a paper bot orients the user at My bots, like any researched bot.
      expect(router.currentRoute.value.params.section).toBe('my-bots');
      await router.push('/bots');
      await flushPromises();
      wrapper.getComponent({ name: 'QuantCommandCenter' }).vm.$emit('swap', 'val');
      await flushPromises();
      expect(swapStore.setTokenFromAddress).toHaveBeenCalledWith(XOR.address);
      expect(swapStore.setTokenToAddress).toHaveBeenCalledWith('val');
      expect(router.currentRoute.value.name).toBe('Swap');
      expect(router.currentRoute.value.params.second).toBe('val');
      wrapper.unmount();
    });
  });
});

/** Render public catalog status with the real beginner form; status never grants wallet or research authority. */
describe('BotsPage initial public eligibility visibility', () => {
  let state: ReturnType<typeof controller> & {
    assetsLoading: ReturnType<typeof ref<boolean>>;
    assetsError: ReturnType<typeof ref<string>>;
    assetsLoaded: ReturnType<typeof ref<boolean>>;
  };
  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: botTradingRoutes.map((route) => ({ ...route, component: {} })),
    });
    await router.push('/bots');
    await router.isReady();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    state = Object.assign(controller(), { assetsLoading: ref(false), assetsError: ref(''), assetsLoaded: ref(false) });
    state.assets.value = [];
    mocks.controller = state;
    mocks.connection = { isLoggedIn: ref(true), soraAddress: ref('account'), isSoraAccountDialogVisible: ref(false) };
    mocks.translate.mockReset().mockImplementation((key: string) => key);
    mocks.connect.mockReset();
    mocks.createAi.mockReset();
    mocks.loadHistory.mockReset();
    mocks.loadFees.mockReset();
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('explains loading and failure, keeps the failure during retry and clears only after genuine catalog recovery', async () => {
    state.loading.value = true;
    state.assetsLoading.value = true;
    const wrapper = render();
    try {
      await flushPromises();
      expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).toBe('bots.autopilot.tokenLoading');
      expect(wrapper.get('[data-testid="autopilot-assets-status"]').attributes('role')).toBe('status');
      expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
      state.loading.value = false;
      state.assetsLoading.value = false;
      state.assetsError.value = 'bots.errors.stale';
      await flushPromises();
      expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).toBe('bots.autopilot.tokenUnavailable');
      expect(wrapper.get('[data-testid="autopilot-assets-status"]').attributes('role')).toBe('alert');
      expect(wrapper.getComponent({ name: 'BotAutopilot' }).props('error')).toBe('');
      for (const cause of ['bots.errors.config', 'bots.errors.denomination']) {
        state.assetsError.value = cause;
        await flushPromises();
        expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).toBe('bots.autopilot.tokenUnavailable');
        expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).not.toContain(cause);
      }
      state.assetsError.value = 'bots.errors.stale';
      state.assetsLoading.value = true;
      await flushPromises();
      expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).toBe('bots.autopilot.tokenUnavailable');
      state.assets.value = [KUSD, XOR];
      state.assetsLoaded.value = true;
      state.assetsLoading.value = false;
      state.assetsError.value = '';
      await flushPromises();
      expect(wrapper.find('[data-testid="autopilot-assets-status"]').exists()).toBe(false);
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('5');
      expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
      expect(mocks.createAi).not.toHaveBeenCalled();
      expect(mocks.loadHistory).not.toHaveBeenCalled();
      expect(mocks.loadFees).not.toHaveBeenCalled();
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      expect(state.saveLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('retains an existing action error instead of adding an eligibility explanation', async () => {
    state.assetsError.value = 'bots.errors.stale';
    state.error.value = 'bots.errors.storage';
    const wrapper = render();
    try {
      await flushPromises();
      expect(wrapper.find('[data-testid="autopilot-assets-status"]').exists()).toBe(false);
      expect(wrapper.get('.bots-error').text()).toBe('bots.errors.storage');
      expect(state.startBot).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('retains the real qualification error and diagnostic props when eligibility is also unavailable', async () => {
    const module = await import('@/features/bot-trading/useAutopilot');
    const original = module.useAutopilot;
    const diagnostics = { stage: 'training' as const, failures: [{ candidate: 1, reasons: ['netLoss' as const] }] };
    vi.spyOn(module, 'useAutopilot').mockImplementation((deps) => {
      const result = original(deps);
      result.error.value = 'bots.autopilot.errors.validationRejected';
      result.diagnostics.value = diagnostics;
      return result;
    });
    state.assetsError.value = 'bots.errors.stale';
    const wrapper = render();
    try {
      await flushPromises();
      expect(wrapper.find('[data-testid="autopilot-assets-status"]').exists()).toBe(false);
      expect(wrapper.getComponent({ name: 'BotAutopilot' }).props('error')).toBe(
        'bots.autopilot.errors.validationRejected'
      );
      expect(wrapper.getComponent({ name: 'BotAutopilot' }).props('diagnostics')).toEqual(diagnostics);
      expect(wrapper.get('[data-testid="autopilot-error"]').text()).toBe('bots.autopilot.errors.validationRejected');
      expect(mocks.loadHistory).not.toHaveBeenCalled();
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the saved unsigned watch recovery and its original failure ahead of eligibility status', async () => {
    const now = Date.parse('2026-09-26T00:45:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const genesis = `0x${'ab'.repeat(32)}`;
    const network = JSON.stringify([true, genesis, 'wss://unit-test.invalid', 130]);
    const identity = JSON.stringify([true, 'account', 'polkadot-js', true, genesis, 'wss://unit-test.invalid', 130]);
    const checkpoint: AutopilotWatchCheckpoint = {
      version: 1,
      savedAt: now - 3_600_000,
      identity,
      network,
      assistantKind: 'desktop',
      input: {
        assetInAddress: KUSD.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        maxLossPercent: '10',
        targetReturnPercent: '5',
        title: 'Maximize XOR',
        valuationAsset: 'output',
      },
      lastAttemptedCompletedThrough: now - 45 * 60_000,
    };
    checkpoint.lastFailure = copyAutopilotWatchFailure(
      'bots.errors.quote',
      checkpoint.lastAttemptedCompletedThrough,
      checkpoint
    )!;
    expect(writeAutopilotWatchCheckpoint(checkpoint)).toBe(true);
    const stored = sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1');
    state.connectionIdentity.value = identity;
    state.readConnectionIdentity.mockImplementation(() => state.connectionIdentity.value);
    state.readNetworkIdentity.mockReturnValue(network);
    state.assetsError.value = 'bots.errors.stale';
    const wrapper = render();
    try {
      await flushPromises();
      expect(wrapper.find('[data-testid="autopilot-assets-status"]').exists()).toBe(false);
      expect(wrapper.get('[data-testid="autopilot-watch-saved-error"]').text()).toContain('bots.errors.quote');
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('10');
      expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('10');
      expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
      expect(mocks.createAi).not.toHaveBeenCalled();
      expect(mocks.loadHistory).not.toHaveBeenCalled();
      expect(state.prepareLiveBot).not.toHaveBeenCalled();
      expect(state.startBot).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it.each([{ noPair: [] }, { noPair: [XOR] }] as { noPair: import('@/features/bot-trading/types').BotAsset[] }[])(
    'explains accepted no-pair catalog %j and removes the message only when an actual pair arrives',
    async ({ noPair }) => {
      state.assets.value = noPair;
      state.assetsLoaded.value = true;
      const wrapper = render();
      try {
        await flushPromises();
        expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).toBe('bots.autopilot.noLiquidPairs');
        expect(wrapper.get('[data-testid="autopilot-assets-status"]').attributes('role')).toBe('status');
        expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        state.assetsLoading.value = true;
        await flushPromises();
        expect(wrapper.get('[data-testid="autopilot-assets-status"]').text()).toBe('bots.autopilot.tokenLoading');
        state.assets.value = [KUSD, XOR];
        state.assetsLoading.value = false;
        await flushPromises();
        expect(wrapper.find('[data-testid="autopilot-assets-status"]').exists()).toBe(false);
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-capital"]').element.value).toBe('');
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-fee-budget"]').element.value).toBe('1');
        expect(wrapper.get<HTMLInputElement>('[data-testid="autopilot-loss"]').element.value).toBe('5');
        expect(wrapper.get('[data-testid="autopilot-go"]').attributes('disabled')).toBeDefined();
        expect(mocks.createAi).not.toHaveBeenCalled();
        expect(mocks.loadHistory).not.toHaveBeenCalled();
        expect(mocks.loadFees).not.toHaveBeenCalled();
        expect(state.createBot).not.toHaveBeenCalled();
        expect(state.resetGoal).not.toHaveBeenCalled();
        expect(state.prepareLiveBot).not.toHaveBeenCalled();
        expect(state.saveLiveBot).not.toHaveBeenCalled();
        expect(state.startBot).not.toHaveBeenCalled();
      } finally {
        wrapper.unmount();
      }
    }
  );
});
