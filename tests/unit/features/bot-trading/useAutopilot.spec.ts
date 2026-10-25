import { defineComponent, h, ref, unref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutopilot } from '@/features/bot-trading/useAutopilot';
import {
  copyAutopilotWatchFailure,
  copyAutopilotTrainingWatchDiagnostics,
} from '@/features/bot-trading/autopilot-watch-checkpoint';
import {
  AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
  createAutopilotFeeBudgetError,
  createAutopilotImpactPreflightError,
  createAutopilotOpeningError,
  createAutopilotQualificationError,
} from '@/features/bot-trading/autopilot-diagnostics';
import type { AutopilotInput, AutopilotResearchOptions, AutopilotResult } from '@/features/bot-trading/autopilot';
import type { BotDefinition } from '@/features/bot-trading/types';
import { createDesktopAiClient, type DesktopAiContext, type DesktopAiOptions } from '@/features/bot-trading/desktop-ai';
import {
  CompanionRequestError,
  createLocalCodexCompanion,
  type LocalCodexCompanion,
} from '@/features/bot-trading/local-codex-companion';
import type { BotAiClient } from '@/features/bot-trading/ai';
import { botFixture } from './fixtures';
import { goalStorageBot } from './goal-storage-fixtures';
import { GOAL_EXACT_KUSD, GOAL_EXACT_XOR } from '@/features/bot-trading/goal-exact-ledger';
import { toCodec } from '@/features/bot-trading/amounts';
import type {
  AutopilotValidationExposureStore,
  AutopilotValidationWindow,
} from '@/features/bot-trading/autopilot-exposure';
vi.unmock('@polkadot/util-crypto');

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

/** A shared fake models atomic exposure writes across composable lifetimes without browser services. */
function memoryExposureStore(): AutopilotValidationExposureStore {
  const windows = new Map<string, AutopilotValidationWindow>();
  return {
    read: vi.fn(async (key) => windows.get(key) ?? null),
    reserve: vi.fn(async (key, window) => {
      if (window.from <= (windows.get(key)?.to ?? 0)) throw Error('bots.errors.stale');
      windows.set(key, { ...window });
    }),
    saveDiagnostics: vi.fn(async (key, window, diagnostics) => {
      const current = windows.get(key);
      if (!current || current.from !== window.from || current.to !== window.to) throw Error('bots.errors.stale');
      windows.set(key, { ...current, diagnostics: structuredClone(diagnostics) });
    }),
  };
}

/** Only public fixture data crosses these boundaries; no wallet, provider or chain is contacted. */
function setup(
  exact = false,
  enableWatching = false,
  realDesktop = false,
  exposureStore: AutopilotValidationExposureStore = memoryExposureStore()
) {
  const draft = { ...botFixture(), id: 'review', mode: 'live' as const };
  const trading = {
    assets: ref([draft.assetIn, draft.assetOut]),
    bots: ref<BotDefinition[]>([]),
    walletConnected: ref(true),
    externalWallet: ref(false),
    connectionIdentity: ref('wallet-one'),
    sessionActiveIds: ref<string[]>([]),
    readConnectionIdentity: vi.fn(() => trading.connectionIdentity.value),
    readNetworkIdentity: vi.fn(() => JSON.stringify([true, 'genesis', 'endpoint', 123])),
    prepareLiveBot: vi.fn(async () => draft),
    previewLiveFunding: vi.fn(async () => ({ sufficient: true, assets: [] })),
    saveLiveBot: vi.fn(async () => {
      trading.bots.value = [draft];
      return draft.id;
    }),
    discardLiveReview: vi.fn(),
    startBot: vi.fn(async () => undefined),
    pauseBot: vi.fn(async () => undefined),
    stopBot: vi.fn(async () => undefined),
    exactGoalAvailable: exact,
    prepareGoalReview: vi.fn(async (_options?: { signal?: AbortSignal }) => ({
      bot: draft,
      funding: { sufficient: true, assets: [] },
      draftId: 'stable-goal-draft',
    })),
    refreshGoalReview: vi.fn(async (_id: string, _options?: { signal?: AbortSignal }) => ({
      bot: draft,
      funding: { sufficient: true, assets: [] },
      draftId: 'stable-goal-draft',
    })),
    approveGoalReview: vi.fn(async (_id: string) => {
      const funded = { ...goalStorageBot(), id: draft.id };
      trading.bots.value = [funded];
      return funded;
    }),
    discardGoalReview: vi.fn(),
    resumeGoalReview: vi.fn(async (_id: string, _options?: { signal?: AbortSignal }) => ({
      bot: draft,
      funding: { sufficient: true, assets: [] },
      draftId: 'stable-goal-draft',
    })),
  };
  const client = {
    listModels: vi.fn(async () => [{ id: 'available-mini', name: 'Mini', createdAt: 1 }]),
    selectModel: vi.fn(),
    disconnect: vi.fn(),
    suggest: vi.fn(),
    propose: vi.fn(),
  };
  const result = { bot: botFixture(), settings: {}, research: {}, denomination: {}, candidates: 3 } as AutopilotResult;
  const researcher = {
    run: vi.fn<(input: unknown, client: unknown, signal?: AbortSignal) => Promise<AutopilotResult>>(async () => result),
    cancel: vi.fn(),
    dispose: vi.fn(),
  };
  const ai = vi.fn(() => client);
  const desktopClient = {
    ...client,
    connectionId: String(crypto.randomUUID()),
    disconnect: vi.fn(),
    syncTools: vi.fn(async () => true),
    getStatus: vi.fn(),
    readContext: vi.fn(),
    submitDraft: vi.fn(async (_value: unknown) => ({
      status: 'research_started' as const,
      requiresTradingAuthorization: true as const,
    })),
    connect: vi.fn(async (_value: unknown) => {
      onAgentConnected?.();
      return { connectionId: desktopClient.connectionId, connected: true, state: 'awaiting_budget' as const };
    }),
  };
  let onPending: ((pending: boolean) => void) | undefined;
  let onAgentConnected: (() => void) | undefined;
  let onContext: ((context: DesktopAiContext | null) => void) | undefined;
  const desktopAi = vi.fn(async (options: DesktopAiOptions = {}) => {
    onPending = options.onPending;
    onAgentConnected = options.onAgentConnected;
    onContext = options.onContext;
    if (realDesktop) return createDesktopAiClient(options, {} as Document);
    desktopClient.connectionId = options.connectionId!;
    return desktopClient;
  });
  const desktopSupport = vi.fn(() => true);
  const companion: LocalCodexCompanion = {
    pair: vi.fn(async () => undefined),
    draft: vi.fn(async (context: DesktopAiContext) => ({ requestId: context.requestId, strategy: {} })),
    discoveryDraft: vi.fn(async (context) => ({ requestId: context.requestId, strategy: {} })),
    disconnect: vi.fn(),
  };
  const createCompanion = vi.fn(() => companion);
  let researchOptions!: AutopilotResearchOptions;
  const research = vi.fn((options: AutopilotResearchOptions) => {
    researchOptions = options;
    return researcher;
  });
  const readResearchReadiness = vi.fn<
    (
      input: Omit<AutopilotInput, 'assets'>,
      signal: AbortSignal
    ) => Promise<{ completedThrough: number; validationFrom: number } | null>
  >(async () => null);
  const requestWallet = vi.fn<() => void | Promise<void>>();
  let state!: ReturnType<typeof useAutopilot>;
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useAutopilot({
          trading: trading as unknown as Parameters<typeof useAutopilot>[0]['trading'],
          ai,
          desktopAi,
          desktopSupport,
          companion: createCompanion,
          research,
          requestWallet,
          loadHistory: vi.fn(),
          loadFees: vi.fn(),
          validationExposureStore: exposureStore,
          ...(enableWatching ? { readResearchReadiness } : {}),
        });
        return () => h('div');
      },
    })
  );
  wrappers.push(wrapper);
  const input = {
    assetInAddress: draft.assetIn.address,
    assetOutAddress: draft.assetOut.address,
    capital: '100.000000000000000001',
    feeBudgetXor: '1',
    targetReturnPercent: '5',
    maxLossPercent: '5',
    title: 'Grow',
  };
  if (exact) Object.assign(input, { assetInAddress: GOAL_EXACT_KUSD, assetOutAddress: GOAL_EXACT_XOR, capital: '10' });
  const connect = () => state.connect({ provider: 'openai', apiKey: 'test-secret', endpoint: '' });
  return {
    state,
    trading,
    client,
    researcher,
    readResearchReadiness,
    reportHistory: (completedThrough: number, validationFrom = completedThrough - 49 * 3_600_000) =>
      researchOptions.onHistoryPrepared?.({ completedThrough, validationFrom }),
    reportValidation: (from: number, to: number) => researchOptions.onValidationStarted?.({ from, to }),
    exposureStore,
    ai,
    input,
    connect,
    requestWallet,
    draft,
    desktopAi,
    desktopClient,
    desktopSupport,
    companion,
    createCompanion,
    reportDesktopPending: (pending: boolean) => onPending?.(pending),
    reportAgentConnected: () => onAgentConnected?.(),
    reportDesktopContext: (context: DesktopAiContext | null) => onContext?.(context),
  };
}

describe('beginner automatic trading setup', () => {
  it('keeps desktop progress tied to research and review after the draft mailbox is consumed', async () => {
    const { state, input, desktopAi, researcher, trading, reportAgentConnected } = setup();
    await state.connectDesktop();
    reportAgentConnected();
    const readProgress = desktopAi.mock.calls[0][0]!.readProgress!;
    expect(readProgress()).toEqual({ state: 'awaiting_budget' });
    let finish!: (result: AutopilotResult) => void;
    researcher.run.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const researching = state.research(input);
    expect(readProgress()).toEqual({ state: 'researching' });
    await flushPromises();
    finish({ bot: botFixture(), settings: {}, research: {}, denomination: {}, candidates: 3 } as AutopilotResult);
    await researching;
    expect(readProgress()).toEqual({ state: 'awaiting_review' });
    expect(trading.startBot).not.toHaveBeenCalled();
    await state.start({ password: 'fixture-only' });
    expect(readProgress()).toEqual({ state: 'bot_available' });
    expect(readProgress()).not.toHaveProperty('wallet');
    trading.bots.value = [];
    expect(readProgress()).toEqual({ state: 'unavailable' });
    state.disconnectDesktop();
    expect(readProgress()).toEqual({ state: 'unavailable' });
  });

  it('makes trusted rejection diagnostics available until cancellation without exposing provider errors', async () => {
    const { state, input, desktopAi, researcher, trading, reportAgentConnected } = setup();
    await state.connectDesktop();
    reportAgentConnected();
    const readProgress = desktopAi.mock.calls[0][0]!.readProgress!;
    researcher.run.mockRejectedValueOnce(
      createAutopilotQualificationError('validation', [{ candidate: 2, reasons: ['drawdown'] }])
    );
    await state.research(input);
    expect(readProgress()).toEqual({
      state: 'research_failed',
      errorKey: 'bots.autopilot.errors.validationRejected',
      diagnostics: { stage: 'validation', failures: [{ candidate: 2, reasons: ['drawdown'] }] },
    });
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    state.cancel();
    expect(readProgress()).toEqual({ state: 'awaiting_budget' });
    researcher.run.mockRejectedValueOnce(new Error('secret-provider-response'));
    await state.research(input);
    expect(readProgress()).toEqual({ state: 'research_failed', errorKey: 'bots.autopilot.errors.research' });
    expect(JSON.stringify(readProgress())).not.toContain('secret-provider-response');
    researcher.run.mockRejectedValueOnce(new Error('bots.errors.SecretProviderResponse'));
    await state.research(input);
    expect(readProgress()).toEqual({ state: 'research_failed', errorKey: 'bots.autopilot.errors.research' });
  });

  it('revokes a detached progress callback when its component unmounts', async () => {
    const { state, desktopAi, reportAgentConnected } = setup();
    await state.connectDesktop();
    reportAgentConnected();
    const readProgress = desktopAi.mock.calls[0][0]!.readProgress!;
    wrappers.pop()!.unmount();
    expect(readProgress()).toEqual({ state: 'unavailable' });
  });

  it('GO retains exact capital and starts output-denominated research after the assistant acknowledges', async () => {
    const { state, input, desktopAi, researcher, trading, reportAgentConnected } = setup();
    await state.go(input);
    expect(desktopAi).toHaveBeenCalledOnce();
    expect(state.stage.value).toBe('connect');
    expect(researcher.run).not.toHaveBeenCalled();
    input.capital = '999';
    reportAgentConnected();
    await flushPromises();
    expect(researcher.run).toHaveBeenCalledOnce();
    expect(researcher.run).toHaveBeenCalledWith(
      expect.objectContaining({ capital: '100.000000000000000001', valuationAsset: 'output' }),
      expect.anything(),
      expect.any(AbortSignal)
    );
    expect(state.stage.value).toBe('review');
    expect(trading.saveLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('GO opens the missing wallet once and automatically continues after connection', async () => {
    const { state, input, trading, requestWallet, desktopAi, reportAgentConnected, researcher } = setup();
    trading.walletConnected.value = false;
    await state.go(input);
    expect(requestWallet).toHaveBeenCalledOnce();
    expect(state.awaitingWallet.value).toBe(true);
    expect(desktopAi).not.toHaveBeenCalled();
    trading.connectionIdentity.value = 'newly-connected-wallet';
    trading.walletConnected.value = true;
    await flushPromises();
    expect(state.awaitingWallet.value).toBe(false);
    expect(desktopAi).toHaveBeenCalledOnce();
    reportAgentConnected();
    await flushPromises();
    expect(researcher.run).toHaveBeenCalledWith(
      expect.objectContaining(input),
      expect.anything(),
      expect.any(AbortSignal)
    );
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('cancel revokes GO even when the wallet connects later', async () => {
    const { state, input, trading, requestWallet, desktopAi, researcher } = setup();
    trading.walletConnected.value = false;
    await state.go(input);
    expect(requestWallet).toHaveBeenCalledOnce();
    state.cancel();
    trading.walletConnected.value = true;
    await flushPromises();
    expect(state.awaitingWallet.value).toBe(false);
    expect(state.stage.value).toBe('welcome');
    expect(desktopAi).not.toHaveBeenCalled();
    expect(researcher.run).not.toHaveBeenCalled();
  });

  it('restores the waiting assistant step after a wallet reconnect without replacing its ID', async () => {
    const { state, input, trading, desktopAi, researcher } = setup();
    await state.go(input);
    const connectionId = state.desktopConnectionId.value;
    trading.walletConnected.value = false;
    await flushPromises();
    expect(state.awaitingWallet.value).toBe(true);
    trading.walletConnected.value = true;
    await flushPromises();
    expect(state.stage.value).toBe('connect');
    expect(state.awaitingWallet.value).toBe(false);
    expect(state.desktopConnectionId.value).toBe(connectionId);
    expect(desktopAi).toHaveBeenCalledOnce();
    expect(researcher.run).not.toHaveBeenCalled();
  });

  it('keeps the submitted GO when switching to the optional API connection', async () => {
    const { state, input, connect, researcher, trading } = setup();
    await state.go(input);
    state.disconnectDesktop();
    await connect();
    await flushPromises();
    expect(researcher.run).toHaveBeenCalledOnce();
    expect(researcher.run).toHaveBeenCalledWith(
      expect.objectContaining({ ...input, valuationAsset: 'output' }),
      expect.anything(),
      expect.any(AbortSignal)
    );
    expect(state.stage.value).toBe('review');
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('GO with an existing AI connection reaches review without repeated setup', async () => {
    const { state, input, connect, researcher, requestWallet, desktopAi } = setup();
    await connect();
    await state.go(input);
    expect(researcher.run).toHaveBeenCalledOnce();
    expect(state.stage.value).toBe('review');
    expect(requestWallet).not.toHaveBeenCalled();
    expect(desktopAi).not.toHaveBeenCalled();
  });

  it('uses desktop site tools without constructing an API client or requesting model credentials', async () => {
    const { state, desktopAi, desktopClient, client, ai, researcher, input, trading, reportAgentConnected } = setup();
    await state.begin();
    await state.connectDesktop();
    expect(desktopAi).toHaveBeenCalledOnce();
    expect(ai).not.toHaveBeenCalled();
    expect(client.listModels).not.toHaveBeenCalled();
    expect(client.selectModel).not.toHaveBeenCalled();
    expect(state.desktopMode.value).toBe(true);
    expect(state.stage.value).toBe('connect');
    expect(state.desktopConnected.value).toBe(false);
    await state.research(input);
    expect(researcher.run).not.toHaveBeenCalled();
    reportAgentConnected();
    expect(state.desktopConnected.value).toBe(true);
    expect(state.stage.value).toBe('fund');
    await state.research(input);
    expect(researcher.run).toHaveBeenCalledWith(expect.objectContaining(input), desktopClient, expect.any(AbortSignal));
    expect(state.stage.value).toBe('review');
    expect(trading.saveLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('uses the same-page controls without WebMCP and waits for a real acknowledgment', async () => {
    const { state, desktopSupport, desktopAi, desktopClient } = setup();
    desktopSupport.mockReturnValue(false);
    await state.connectDesktop();
    expect(desktopAi).toHaveBeenCalledWith(
      expect.objectContaining({ portable: true, connectionId: state.desktopConnectionId.value })
    );
    expect(state.desktopConnected.value).toBe(false);
    expect(state.desktopConnecting.value).toBe(true);
    expect(state.stage.value).toBe('connect');
    expect(state.error.value).toBe('');
    const connectionId = state.desktopConnectionId.value;
    await state.acknowledgeDesktop(connectionId);
    expect(desktopClient.connect).toHaveBeenCalledWith({ connectionId });
    expect(state.stage.value).toBe('fund');
    expect(state.desktopConnected.value).toBe(true);
  });

  it('pairs local Codex only on request and answers each fresh training context through the existing mailbox', async () => {
    const {
      state,
      desktopClient,
      companion,
      createCompanion,
      researcher,
      input,
      reportDesktopPending,
      reportDesktopContext,
      trading,
    } = setup();
    const goal = { ...input, assetInAddress: GOAL_EXACT_KUSD, assetOutAddress: GOAL_EXACT_XOR, capital: '10' };
    let finishFirst!: (result: AutopilotResult) => void;
    researcher.run.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)));
    await state.go(goal);
    expect(createCompanion).not.toHaveBeenCalled();
    expect(state.desktopConnected.value).toBe(false);
    await state.pairCompanion('a'.repeat(32));
    await vi.waitFor(() => expect(researcher.run).toHaveBeenCalledOnce());
    expect(researcher.run).toHaveBeenCalledWith(
      expect.objectContaining({ ...goal, valuationAsset: 'output' }),
      desktopClient,
      expect.any(AbortSignal)
    );
    expect(companion.pair).toHaveBeenCalledWith('a'.repeat(32), expect.any(AbortSignal));
    expect(desktopClient.connect).toHaveBeenCalledExactlyOnceWith({ connectionId: state.desktopConnectionId.value });
    expect(state.companionConnected.value).toBe(true);
    expect(trading.startBot).not.toHaveBeenCalled();

    for (const [index, requestId] of ['first-hour', 'next-hour'].entries()) {
      let finish = finishFirst;
      let researching: Promise<void> | undefined;
      if (index > 0) {
        researcher.run.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
        researching = state.research(goal);
        await flushPromises();
      }
      const context = { requestId, purpose: 'autopilot-training' } as unknown as DesktopAiContext;
      reportDesktopPending(true);
      reportDesktopContext(context);
      await flushPromises();
      expect(companion.draft).toHaveBeenCalledWith(context, expect.any(AbortSignal));
      expect(desktopClient.submitDraft).toHaveBeenCalledWith({ requestId, strategy: {} });
      reportDesktopContext(null);
      reportDesktopPending(false);
      finish({ bot: botFixture(), settings: {}, research: {}, denomination: {}, candidates: 3 } as AutopilotResult);
      if (researching) await researching;
      else await vi.waitFor(() => expect(state.stage.value).toBe('review'));
    }
    expect(companion.draft).toHaveBeenCalledTimes(2);
    expect(trading.startBot).not.toHaveBeenCalled();
    state.disconnectDesktop();
    expect(companion.disconnect).toHaveBeenCalled();
    expect(state.companionConnected.value).toBe(false);
  });

  it('aborts a late local draft on cancel and never submits it to a newer request', async () => {
    const { state, companion, desktopClient, researcher, input, reportDesktopPending, reportDesktopContext } = setup();
    await state.connectDesktop();
    await state.pairCompanion('a'.repeat(32));
    let reply!: (value: { requestId: string; strategy: unknown }) => void;
    vi.mocked(companion.draft).mockImplementationOnce(() => new Promise((resolve) => (reply = resolve)));
    researcher.run.mockImplementationOnce(
      (_input, _client, signal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(Error('cancelled')), { once: true })
        )
    );
    const researching = state.research(input);
    await flushPromises();
    reportDesktopPending(true);
    reportDesktopContext({ requestId: 'old-hour' } as DesktopAiContext);
    await flushPromises();
    const signal = vi.mocked(companion.draft).mock.calls[0][1];
    state.cancel();
    expect(signal.aborted).toBe(true);
    reply({ requestId: 'old-hour', strategy: {} });
    await researching;
    await flushPromises();
    expect(desktopClient.submitDraft).not.toHaveBeenCalled();
    expect(state.companionConnected.value).toBe(true);
  });

  it('keeps the visible manual draft path usable when the local Codex request fails', async () => {
    const { state, companion, desktopClient, researcher, input, reportDesktopPending, reportDesktopContext } = setup();
    await state.connectDesktop();
    await state.pairCompanion('a'.repeat(32));
    vi.mocked(companion.draft).mockRejectedValueOnce(new Error('private local process output'));
    researcher.run.mockImplementationOnce(
      (_input, _client, signal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(Error('cancelled')), { once: true })
        )
    );
    const researching = state.research(input);
    await flushPromises();
    reportDesktopPending(true);
    reportDesktopContext({ requestId: 'manual-fallback' } as DesktopAiContext);
    await flushPromises();
    expect(state.companionError.value).toBe('bots.autopilot.companion.draftError');
    expect(state.desktopPending.value).toBe(true);
    expect(state.companionError.value).not.toContain('private local process output');
    await state.submitDesktopDraft('{"requestId":"manual-fallback","strategy":{}}');
    expect(desktopClient.submitDraft).toHaveBeenCalledExactlyOnceWith({
      requestId: 'manual-fallback',
      strategy: {},
    });
    state.cancel();
    await researching;
  });

  it('preserves a quota failure when the unsigned request expires without disconnecting or trading', async () => {
    const f = setup(false, true);
    await f.state.connectDesktop();
    await f.state.pairCompanion('a'.repeat(32));
    vi.mocked(f.companion.draft).mockRejectedValueOnce(new CompanionRequestError('usageLimit'));
    let expire!: (error: Error) => void;
    f.researcher.run.mockImplementationOnce(() => new Promise((_resolve, reject) => (expire = reject)));
    const researching = f.state.research(f.input);
    await flushPromises();
    f.reportHistory(Math.floor(Date.now() / 3_600_000) * 3_600_000);
    f.reportDesktopPending(true);
    f.reportDesktopContext({ requestId: 'quota-hour' } as DesktopAiContext);
    await flushPromises();
    expect(f.state.companionError.value).toBe('bots.autopilot.companion.usageLimit');
    expect(f.state.companionConnected.value).toBe(true);
    expect(f.companion.disconnect).not.toHaveBeenCalled();
    expire(new Error('bots.codex.expired'));
    await researching;
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.canRefreshDesktopRequest.value).toBe(true);
    expect(f.state.companionError.value).toBe('bots.autopilot.companion.usageLimit');
    expect(f.companion.draft).toHaveBeenCalledOnce();
    expect(f.desktopClient.submitDraft).not.toHaveBeenCalled();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
    f.state.cancel();
  });

  it('retries a failed local draft only against the still-pending request', async () => {
    const { state, companion, desktopClient, researcher, input, reportDesktopPending, reportDesktopContext } = setup();
    await state.connectDesktop();
    await state.pairCompanion('a'.repeat(32));
    vi.mocked(companion.draft).mockRejectedValueOnce(new Error('temporary local failure'));
    researcher.run.mockImplementationOnce(
      (_input, _client, signal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(Error('cancelled')), { once: true })
        )
    );
    const researching = state.research(input);
    await flushPromises();
    const context = { requestId: 'retry-hour' } as DesktopAiContext;
    reportDesktopPending(true);
    reportDesktopContext(context);
    await flushPromises();
    expect(state.companionError.value).toBe('bots.autopilot.companion.draftError');
    desktopClient.readContext.mockReturnValueOnce(context);
    state.retryCompanionDraft();
    await flushPromises();
    expect(companion.draft).toHaveBeenCalledTimes(2);
    expect(desktopClient.submitDraft).toHaveBeenCalledWith({ requestId: 'retry-hour', strategy: {} });
    state.cancel();
    await researching;
  });

  it('re-pairs during a pending request after the local bearer expires', async () => {
    const { state, companion, desktopClient, researcher, input, reportDesktopPending, reportDesktopContext } = setup();
    await state.connectDesktop();
    await state.pairCompanion('a'.repeat(32));
    vi.mocked(companion.draft).mockRejectedValueOnce(new CompanionRequestError('unauthorized'));
    researcher.run.mockImplementationOnce(
      (_input, _client, signal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(Error('cancelled')), { once: true })
        )
    );
    const researching = state.research(input);
    await flushPromises();
    const context = { requestId: 'renewed-hour' } as DesktopAiContext;
    reportDesktopPending(true);
    reportDesktopContext(context);
    await flushPromises();
    expect(state.companionConnected.value).toBe(false);
    expect(state.companionError.value).toBe('bots.autopilot.companion.pairAgain');
    desktopClient.readContext.mockReturnValueOnce(context);
    await state.pairCompanion('b'.repeat(32));
    await flushPromises();
    expect(companion.pair).toHaveBeenCalledTimes(2);
    expect(state.companionConnected.value).toBe(true);
    expect(desktopClient.submitDraft).toHaveBeenCalledWith({ requestId: 'renewed-hour', strategy: {} });
    state.cancel();
    await researching;
  });

  it('clears a dead companion and re-pairs without losing the pending request', async () => {
    const { state, companion, desktopClient, researcher, input, reportDesktopPending, reportDesktopContext } = setup();
    await state.connectDesktop();
    await state.pairCompanion('a'.repeat(32));
    vi.mocked(companion.draft).mockRejectedValueOnce(new CompanionRequestError('unavailable'));
    researcher.run.mockImplementationOnce(
      (_input, _client, signal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(Error('cancelled')), { once: true })
        )
    );
    const researching = state.research(input);
    await flushPromises();
    const context = { requestId: 'interrupted-hour' } as DesktopAiContext;
    reportDesktopPending(true);
    reportDesktopContext(context);
    await flushPromises();
    expect(companion.disconnect).toHaveBeenCalledOnce();
    expect(state.companionConnected.value).toBe(false);
    expect(state.companionError.value).toBe('bots.autopilot.companion.offline');
    expect(state.desktopPending.value).toBe(true);
    expect(desktopClient.submitDraft).not.toHaveBeenCalled();
    desktopClient.readContext.mockReturnValueOnce(context);
    await state.pairCompanion('b'.repeat(32));
    await flushPromises();
    expect(state.companionConnected.value).toBe(true);
    expect(desktopClient.submitDraft).toHaveBeenCalledWith({ requestId: 'interrupted-hour', strategy: {} });
    state.cancel();
    await researching;
  });

  it('clears failed GO pairing when the local helper is unavailable without drafting or starting a bot', async () => {
    const { state, companion, desktopClient, trading } = setup();
    await state.connectDesktop();
    vi.mocked(companion.pair).mockRejectedValueOnce(new CompanionRequestError('unavailable'));
    await state.pairCompanion('a'.repeat(32));
    expect(state.companionPairing.value).toBe(false);
    expect(state.companionConnected.value).toBe(false);
    expect(state.companionError.value).toBe('bots.autopilot.companion.pairError');
    expect(companion.disconnect).toHaveBeenCalledOnce();
    expect(desktopClient.connect).not.toHaveBeenCalled();
    expect(companion.draft).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('aborts a pending GO pairing fetch at 30 seconds and releases the explicit pair action', async () => {
    vi.useFakeTimers();
    try {
      const { state, createCompanion, desktopClient, trading } = setup();
      const helper = createLocalCodexCompanion();
      const disconnect = vi.spyOn(helper, 'disconnect');
      createCompanion.mockReturnValueOnce(helper);
      const fetch = vi.fn(
        (_url: RequestInfo | URL, options?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
              once: true,
            });
          })
      );
      vi.stubGlobal('fetch', fetch);
      await state.connectDesktop();
      const pairing = state.pairCompanion('a'.repeat(32));
      const signal = fetch.mock.calls[0][1]!.signal!;
      expect(fetch).toHaveBeenCalledExactlyOnceWith(
        'http://127.0.0.1:39847/pair',
        expect.objectContaining({ credentials: 'omit', redirect: 'error', signal })
      );
      await vi.advanceTimersByTimeAsync(29_999);
      expect(signal.aborted).toBe(false);
      expect(state.companionPairing.value).toBe(true);
      await vi.advanceTimersByTimeAsync(1);
      await pairing;
      expect(signal.aborted).toBe(true);
      expect(state.companionPairing.value).toBe(false);
      expect(state.companionConnected.value).toBe(false);
      expect(state.companionError.value).toBe('bots.autopilot.companion.pairError');
      expect(disconnect).toHaveBeenCalledOnce();
      expect(desktopClient.connect).not.toHaveBeenCalled();
      expect(trading.startBot).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('cancels a pending GO pairing fetch without a later timeout error or acknowledgment', async () => {
    vi.useFakeTimers();
    try {
      const { state, createCompanion, desktopClient, trading } = setup();
      const helper = createLocalCodexCompanion();
      const disconnect = vi.spyOn(helper, 'disconnect');
      createCompanion.mockReturnValueOnce(helper);
      const fetch = vi.fn(
        (_url: RequestInfo | URL, options?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
              once: true,
            });
          })
      );
      vi.stubGlobal('fetch', fetch);
      await state.connectDesktop();
      const pairing = state.pairCompanion('a'.repeat(32));
      const signal = fetch.mock.calls[0][1]!.signal!;
      state.cancel();
      await pairing;
      expect(signal.aborted).toBe(true);
      expect(state.companionPairing.value).toBe(false);
      expect(state.companionError.value).toBe('');
      await vi.advanceTimersByTimeAsync(30_000);
      expect(state.companionError.value).toBe('');
      expect(disconnect).toHaveBeenCalledOnce();
      expect(desktopClient.connect).not.toHaveBeenCalled();
      expect(trading.startBot).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('cancels reconnect pairing immediately and ignores its late reply without disturbing a newer explicit pair', async () => {
    vi.useFakeTimers();
    try {
      const { state, createCompanion, companion, desktopClient, trading, reportAgentConnected } = setup();
      const helper = createLocalCodexCompanion();
      const disconnectCanceledHelper = vi.spyOn(helper, 'disconnect');
      createCompanion.mockReturnValueOnce(helper);
      let reply!: (response: Response) => void;
      const fetch = vi.fn(
        (_url: RequestInfo | URL, _options?: RequestInit) =>
          new Promise<Response>((resolve) => {
            reply = resolve;
          })
      );
      vi.stubGlobal('fetch', fetch);
      await state.connectDesktop();
      reportAgentConnected();
      const connectionId = state.desktopConnectionId.value;
      expect(state.desktopConnected.value).toBe(true);
      expect(state.desktopConnecting.value).toBe(false);
      expect(state.companionConnected.value).toBe(false);
      const canceledPair = state.pairCompanion('a'.repeat(32));
      const signal = fetch.mock.calls[0][1]!.signal!;
      expect(state.companionPairing.value).toBe(true);
      state.cancel();
      expect(signal.aborted).toBe(true);
      expect(state.companionPairing.value).toBe(false);
      expect(state.desktopConnected.value).toBe(true);
      expect(state.desktopConnectionId.value).toBe(connectionId);
      expect(state.companionError.value).toBe('');
      expect(desktopClient.connect).not.toHaveBeenCalled();
      expect(companion.draft).not.toHaveBeenCalled();
      expect(trading.startBot).not.toHaveBeenCalled();

      await state.pairCompanion('b'.repeat(32));
      expect(state.companionConnected.value).toBe(true);
      expect(desktopClient.connect).toHaveBeenCalledExactlyOnceWith({ connectionId });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(state.companionConnected.value).toBe(true);
      expect(state.companionError.value).toBe('');
      reply(new Response(JSON.stringify({ token: 'c'.repeat(64), expiresAt: Date.now() + 60_000 })));
      await canceledPair;
      expect(disconnectCanceledHelper).toHaveBeenCalledOnce();
      expect(companion.disconnect).not.toHaveBeenCalled();
      expect(state.companionConnected.value).toBe(true);
      expect(state.companionPairing.value).toBe(false);
      expect(state.desktopConnected.value).toBe(true);
      expect(state.desktopConnectionId.value).toBe(connectionId);
      expect(state.companionError.value).toBe('');
      expect(desktopClient.connect).toHaveBeenCalledOnce();
      expect(companion.draft).not.toHaveBeenCalled();
      expect(trading.startBot).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('clears the GO pairing deadline after success so an established connection is not aborted', async () => {
    vi.useFakeTimers();
    try {
      const { state, companion, desktopClient } = setup();
      await state.connectDesktop();
      await state.pairCompanion('a'.repeat(32));
      const signal = vi.mocked(companion.pair).mock.calls[0][1];
      await vi.advanceTimersByTimeAsync(30_000);
      expect(signal.aborted).toBe(false);
      expect(state.companionConnected.value).toBe(true);
      expect(state.companionError.value).toBe('');
      expect(desktopClient.connect).toHaveBeenCalledOnce();
    } finally {
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      vi.useRealTimers();
    }
  });

  it('drops a pairing result that arrives after the page session was canceled', async () => {
    const { state, companion, desktopClient } = setup();
    await state.connectDesktop();
    let finish!: () => void;
    vi.mocked(companion.pair).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pairing = state.pairCompanion('a'.repeat(32));
    state.cancel();
    finish();
    await pairing;
    expect(desktopClient.connect).not.toHaveBeenCalled();
    expect(companion.disconnect).toHaveBeenCalled();
    expect(state.companionConnected.value).toBe(false);
  });

  it('does not acknowledge a failed connection and retries with the same page ID', async () => {
    const { state, desktopAi } = setup();
    desktopAi.mockRejectedValueOnce(new Error('private host error'));
    await state.connectDesktop();
    expect(state.desktopConnected.value).toBe(false);
    expect(state.error.value).toBe('bots.autopilot.errors.desktopUnavailable');
    const connectionId = state.desktopConnectionId.value;
    await state.connectDesktop();
    expect(state.desktopConnectionId.value).toBe(connectionId);
    expect(desktopAi).toHaveBeenCalledTimes(2);
    expect(state.desktopConnected.value).toBe(false);
  });

  it('disposes a desktop connection that finishes registering after cancellation', async () => {
    const { state, desktopAi, desktopClient } = setup();
    let complete!: (client: typeof desktopClient) => void;
    desktopAi.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const connecting = state.connectDesktop();
    state.cancel();
    complete(desktopClient);
    await connecting;
    expect(desktopClient.disconnect).toHaveBeenCalledOnce();
    expect(state.desktopMode.value).toBe(false);
    expect(state.stage.value).toBe('welcome');
  });

  it('clears a pending desktop draft on cancellation and ignores late readiness callbacks', async () => {
    const { state, researcher, input, reportDesktopPending, reportAgentConnected } = setup();
    await state.connectDesktop();
    reportAgentConnected();
    researcher.run.mockImplementationOnce(
      (_input, _client, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          reportDesktopPending(true);
          signal?.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
        })
    );
    const researching = state.research(input);
    await flushPromises();
    expect(state.desktopPending.value).toBe(true);
    state.cancel();
    await researching;
    reportDesktopPending(true);
    expect(state.desktopPending.value).toBe(false);
    expect(state.stage.value).toBe('fund');
    expect(state.error.value).toBe('');
  });

  it('revokes desktop tools on leaving the simple flow or switching to an API provider', async () => {
    const { state, desktopClient, trading, connect } = setup();
    await state.connectDesktop();
    state.disconnectDesktop();
    expect(desktopClient.disconnect).toHaveBeenCalledOnce();
    expect(state.desktopMode.value).toBe(false);
    expect(state.stage.value).toBe('connect');
    expect(state.desktopConnecting.value).toBe(false);
    expect(trading.stopBot).not.toHaveBeenCalled();
    await state.connectDesktop();
    await connect();
    expect(desktopClient.disconnect).toHaveBeenCalledTimes(2);
    expect(state.desktopMode.value).toBe(false);
    expect(state.aiLabel.value).toBe('OpenAI');
  });

  it('passes bounded portable JSON through the client and clears public context on cancel', async () => {
    const {
      state,
      desktopClient,
      researcher,
      input,
      reportAgentConnected,
      reportDesktopPending,
      reportDesktopContext,
    } = setup();
    await state.connectDesktop();
    reportAgentConnected();
    const context = { requestId: 'public-draft', purpose: 'autopilot-training' } as unknown as DesktopAiContext;
    researcher.run.mockImplementationOnce(
      (_input, _client, signal) =>
        new Promise((_resolve, reject) => {
          reportDesktopPending(true);
          reportDesktopContext(context);
          signal?.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
        })
    );
    const researching = state.research(input);
    await flushPromises();
    expect(JSON.parse(state.desktopContext.value)).toEqual(context);
    expect(state.desktopPrompt.value).toContain('public-draft');
    expect(state.desktopLink.value).not.toContain('public-draft');
    await state.submitDesktopDraft('bad JSON');
    await state.submitDesktopDraft('x'.repeat(32769));
    expect(desktopClient.submitDraft).not.toHaveBeenCalled();
    await state.submitDesktopDraft('{"requestId":"public-draft","strategy":{}}');
    expect(desktopClient.submitDraft).toHaveBeenCalledExactlyOnceWith({ requestId: 'public-draft', strategy: {} });
    state.cancel();
    await researching;
    reportDesktopContext(context);
    expect(state.desktopContext.value).toBe('');
    await state.submitDesktopDraft('{"requestId":"public-draft","strategy":{}}');
    expect(desktopClient.submitDraft).toHaveBeenCalledOnce();
  });

  it('ignores an old acknowledgment after cancellation and rotates the next connection', async () => {
    const { state, reportAgentConnected } = setup();
    await state.connectDesktop();
    const old = state.desktopConnectionId.value;
    state.cancel();
    reportAgentConnected();
    expect(state.desktopConnected.value).toBe(false);
    expect(state.stage.value).toBe('welcome');
    await state.connectDesktop();
    expect(state.desktopConnectionId.value).not.toBe(old);
    expect(state.desktopConnected.value).toBe(false);
  });

  it('discovers late native tools after a portable acknowledgment without replacing its session', async () => {
    vi.useFakeTimers();
    try {
      const { state, desktopSupport, desktopClient, reportAgentConnected } = setup();
      desktopSupport.mockReturnValue(false);
      await state.connectDesktop();
      reportAgentConnected();
      const connectionId = state.desktopConnectionId.value;
      desktopSupport.mockReturnValue(true);
      await vi.advanceTimersByTimeAsync(1000);
      expect(desktopClient.syncTools).toHaveBeenCalled();
      expect(state.desktopConnectionId.value).toBe(connectionId);
      expect(state.desktopConnected.value).toBe(true);
    } finally {
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      vi.useRealTimers();
    }
  });

  it('discovers a real model and keeps credentials out of public state', async () => {
    const { state, client } = setup();
    const connection = { provider: 'openai' as const, apiKey: 'test-secret', endpoint: '' };
    await state.connect(connection);
    expect(connection.apiKey).toBe('');
    expect(client.selectModel).toHaveBeenCalledWith('available-mini');
    expect(state.stage.value).toBe('fund');
    expect(
      JSON.stringify(Object.fromEntries(Object.entries(state).map(([key, value]) => [key, unref<unknown>(value)])))
    ).not.toContain('test-secret');
  });

  it('researches automatically but saves and unlocks only on the explicit start action', async () => {
    const { state, trading, input, connect, researcher, client } = setup();
    await connect();
    await state.research(input);
    expect(researcher.run).toHaveBeenCalledWith(expect.objectContaining(input), client, expect.any(AbortSignal));
    expect(state.stage.value).toBe('review');
    expect(trading.saveLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
    const credentials = { password: 'unlock-once' };
    await state.start(credentials);
    expect(credentials.password).toBe('');
    expect(trading.saveLiveBot).toHaveBeenCalledOnce();
    expect(trading.startBot).toHaveBeenCalledExactlyOnceWith('review', {
      password: 'unlock-once',
      expectedConnection: 'wallet-one',
    });
    expect(state.stage.value).toBe('running');
    expect(
      JSON.stringify(Object.fromEntries(Object.entries(state).map(([key, value]) => [key, unref<unknown>(value)])))
    ).not.toContain('unlock-once');
  });

  it('rechecks funding before unlocking and refuses a balance that has changed', async () => {
    const { state, trading, input, connect } = setup();
    await connect();
    await state.research(input);
    trading.previewLiveFunding.mockResolvedValueOnce({ sufficient: false, assets: [] });
    await state.start({ password: 'secret' });
    expect(state.error.value).toBe('bots.errors.balance');
    expect(trading.startBot).not.toHaveBeenCalled();
    expect(trading.saveLiveBot).not.toHaveBeenCalled();
  });

  it('renews an expired unsigned review after a deposit without researching or authorizing again', async () => {
    const { state, trading, input, connect, researcher, draft } = setup();
    await connect();
    await state.research(input);
    trading.previewLiveFunding.mockRejectedValueOnce(new Error('bots.errors.session'));
    trading.prepareLiveBot.mockResolvedValueOnce({ ...draft, id: 'renewed' });
    await state.refreshFunding();
    expect(state.reviewBot.value?.id).toBe('renewed');
    expect(trading.discardLiveReview).toHaveBeenCalledWith('review');
    expect(researcher.run).toHaveBeenCalledOnce();
    expect(trading.startBot).not.toHaveBeenCalled();
    expect(state.funding.value?.sufficient).toBe(true);
  });

  it('preserves the desktop expiry explanation and allows GO to prepare a fresh request without trading', async () => {
    const { state, trading, researcher, input } = setup();
    await state.connectDesktop();
    await state.acknowledgeDesktop(state.desktopConnectionId.value);
    researcher.run.mockRejectedValueOnce(new Error('bots.codex.expired'));
    await state.go(input);
    expect(state.error.value).toBe('bots.codex.expired');
    expect(state.stage.value).toBe('fund');
    expect(state.diagnostics.value).toBeNull();
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
    researcher.run.mockRejectedValueOnce(new Error('bots.codex.expired'));
    await state.go(input);
    expect(researcher.run).toHaveBeenCalledTimes(2);
    expect(researcher.run.mock.calls[1][0]).toMatchObject(input);
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('leaves funds untouched when no tested strategy qualifies', async () => {
    const { state, trading, researcher, input, connect } = setup();
    await connect();
    researcher.run.mockRejectedValueOnce(new Error('bots.autopilot.errors.noStrategy'));
    await state.research(input);
    expect(state.error.value).toBe('bots.autopilot.errors.noStrategy');
    expect(state.stage.value).toBe('fund');
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('does not claim training rejected a draft when every exact quote was unavailable', async () => {
    const { state, trading, researcher, input, connect } = setup();
    await connect();
    researcher.run.mockRejectedValueOnce(
      createAutopilotQualificationError('training', [], null, {
        submitted: 1,
        dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
      })
    );
    await state.research(input);
    expect(state.error.value).toBe('bots.autopilot.errors.screeningRejected');
    expect(state.diagnostics.value).toMatchObject({
      stage: 'training',
      failures: [],
      screening: { submitted: 1, dropped: [{ candidate: 1 }] },
    });
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it.each(['training', 'validation'] as const)(
    'preserves trusted %s reasons without authorization or AI disclosure',
    async (phase) => {
      const { state, trading, researcher, input, connect } = setup();
      await connect();
      researcher.run.mockRejectedValueOnce(
        createAutopilotQualificationError(phase, [{ candidate: 2, reasons: ['insufficientTrades', 'netLoss'] }])
      );
      await state.research(input);
      expect(state.error.value).toBe(`bots.autopilot.errors.${phase}Rejected`);
      expect(state.diagnostics.value).toEqual({
        stage: phase,
        failures: [{ candidate: 2, reasons: ['insufficientTrades', 'netLoss'] }],
      });
      expect(state.stage.value).toBe('fund');
      expect(state.desktopContext.value).toBe('');
      expect(state.desktopPrompt.value).not.toContain('insufficientTrades');
      expect(state.desktopPrompt.value).not.toContain('netLoss');
      expect(trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(trading.saveLiveBot).not.toHaveBeenCalled();
      expect(trading.startBot).not.toHaveBeenCalled();
      state.cancel();
      expect(state.diagnostics.value).toBeNull();
      expect(state.error.value).toBe('');
    }
  );

  it('does not carry old reasons into a later research run or trust provider-shaped errors', async () => {
    const { state, researcher, input, connect } = setup();
    await connect();
    researcher.run.mockRejectedValueOnce(
      createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['drawdown'] }])
    );
    await state.research(input);
    const lookalike = Object.assign(new Error('provider secret'), {
      diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: ['netLoss'] }] },
    });
    researcher.run.mockRejectedValueOnce(lookalike);
    await state.research(input);
    expect(state.diagnostics.value).toBeNull();
    expect(state.error.value).toBe('bots.autopilot.errors.research');
  });

  it('shows fee feasibility failure without increasing the reserve or entering live review', async () => {
    const { state, researcher, trading, input, connect } = setup();
    await connect();
    researcher.run.mockRejectedValueOnce(createAutopilotFeeBudgetError());
    await state.research(input);
    expect(state.error.value).toBe('bots.autopilot.errors.insufficientFeeBudget');
    expect(state.diagnostics.value).toBeNull();
    expect(input.feeBudgetXor).toBe('1');
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps opening infeasibility local and preserves the budget without entering live review', async () => {
    const { state, researcher, trading, input, connect } = setup();
    await connect();
    const opening = {
      lossPercent: '10.6972341206832258130349913977100777',
      maxLossPercent: '5',
      valuationSymbol: 'XOR',
      openedAt: 1789228800000,
      firstTradeAt: 1789232400000,
    };
    const before = structuredClone(input);
    researcher.run.mockRejectedValueOnce(createAutopilotOpeningError(opening));
    await state.research(input);
    expect(state.error.value).toBe('bots.autopilot.errors.openingRejected');
    expect(state.diagnostics.value).toEqual({ stage: 'opening', failures: [], opening });
    expect(state.stage.value).toBe('fund');
    expect(state.desktopContext.value).toBe('');
    expect(state.desktopPrompt.value).not.toContain(opening.lossPercent);
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(trading.saveLiveBot).not.toHaveBeenCalled();
    expect(trading.startBot).not.toHaveBeenCalled();
    expect(input).toEqual(before);
    state.cancel();
    expect(state.diagnostics.value).toBeNull();
  });

  it('cancels a late research response without creating a live review', async () => {
    const { state, trading, researcher, input, connect } = setup();
    await connect();
    let finish!: (value: AutopilotResult) => void;
    researcher.run.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = state.research(input);
    await flushPromises();
    state.cancel();
    finish({ bot: botFixture() } as AutopilotResult);
    await pending;
    expect(trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(state.stage.value).toBe('fund');
  });

  it('revokes an unlock that is still pending when setup is cancelled', async () => {
    const { state, trading, input, connect } = setup();
    await connect();
    await state.research(input);
    let finish!: () => void;
    trading.startBot.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(undefined);
        })
    );
    const pending = state.start({ password: 'secret' });
    await flushPromises();
    state.cancel();
    expect(trading.stopBot).toHaveBeenCalledWith('review');
    finish();
    await pending;
    expect(state.reviewBot.value).toBeNull();
  });

  it('discards the reviewed budget on account changes and requires a fresh review for the external wallet', async () => {
    const { state, trading, input, connect } = setup();
    await connect();
    await state.research(input);
    trading.connectionIdentity.value = 'another-wallet';
    await flushPromises();
    expect(trading.discardLiveReview).toHaveBeenCalledWith('review');
    expect(state.reviewBot.value).toBeNull();
    trading.externalWallet.value = true;
    await state.research(input);
    expect(state.error.value).toBe('');
    expect(state.stage.value).toBe('review');
    expect(trading.startBot).not.toHaveBeenCalled();
    const credentials = { password: 'must-not-reach-external-signer' };
    await state.start(credentials);
    expect(credentials.password).toBe('');
    expect(trading.startBot).toHaveBeenCalledExactlyOnceWith('review', {
      password: '',
      expectedConnection: 'another-wallet',
    });
  });

  it('releases a completed goal before starting another setup without resetting its accounting', async () => {
    const { state, trading, draft } = setup();
    const completed = {
      ...draft,
      status: 'paused' as const,
      goal: { title: 'Grow', targetReturnPercent: '5', maxLossPercent: '5', durationMs: 86400000 },
      goalState: {
        startedAt: 1,
        baselineValue: '100',
        lastValue: '105',
        returnPercent: '5',
        outcome: 'target' as const,
        completedAt: 2,
      },
    };
    trading.bots.value = [completed];
    await flushPromises();
    await state.begin();
    expect(trading.stopBot).toHaveBeenCalledWith('review');
    expect(state.stage.value).toBe('connect');
    expect(trading.bots.value[0].goalState).toEqual(completed.goalState);
    expect(trading.startBot).not.toHaveBeenCalled();
  });
  it('routes even a matching exact v1 budget through new GO research and funds only on explicit Start', async () => {
    const f = setup(true);
    await f.state.go(f.input);
    expect(f.state.stage.value).toBe('connect');
    expect(f.desktopAi).toHaveBeenCalledOnce();
    expect(f.trading.prepareGoalReview).not.toHaveBeenCalled();
    f.reportAgentConnected();
    await flushPromises();
    expect(f.state.stage.value).toBe('review');
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.researcher.run.mock.calls[0][0]).toMatchObject({
      capital: '10',
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      feeBudgetXor: '1',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      valuationAsset: 'output',
    });
    expect(f.ai).not.toHaveBeenCalled();
    expect(f.trading.approveGoalReview).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    const secret = { password: 'personal-unlock' };
    await f.state.start(secret);
    expect(secret.password).toBe('');
    expect(f.trading.approveGoalReview).not.toHaveBeenCalled();
    expect(f.trading.startBot).toHaveBeenCalledExactlyOnceWith('review', {
      password: 'personal-unlock',
      expectedConnection: 'wallet-one',
    });
    expect(f.trading.saveLiveBot).toHaveBeenCalledOnce();
    expect(f.trading.previewLiveFunding).toHaveBeenCalledTimes(2);
    expect(f.trading.discardLiveReview).toHaveBeenCalledWith('review');
    expect(f.state.stage.value).toBe('running');
  });
  it('carries the tc1 partial KUSD-to-XOR plan and 10% risk limit from GO to an unsigned review', async () => {
    const f = setup(true);
    const assets = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    f.trading.assets.value = assets;
    f.input.maxLossPercent = '10';
    // The research suite separately proves real replay can produce this bounded shape.
    // Here the synthetic result tests that GO and the live handoff cannot mutate it.
    const initial = { [GOAL_EXACT_KUSD]: toCodec('10', 18), [GOAL_EXACT_XOR]: toCodec('1', 18) };
    const candidate: BotDefinition = {
      ...f.draft,
      assetIn: assets[0],
      assetOut: assets[1],
      strategy: { ...f.draft.strategy, amount: '2' },
      policy: {
        ...f.draft.policy,
        maxTradeCodec: { [GOAL_EXACT_KUSD]: toCodec('2', 18), [GOAL_EXACT_XOR]: toCodec('0.1', 18) },
        maxPriceImpactPercent: '1',
        feeAsset: assets[1],
        feeBudgetCodec: toCodec('1', 18),
      },
      portfolio: { initial, holdings: { ...initial }, feesPaidCodec: '0', trades: 0 },
      goal: {
        title: 'Grow',
        targetReturnPercent: '5',
        maxLossPercent: '10',
        durationMs: 86_400_000,
        valuationAsset: 'output',
        lossMetric: 'drawdown',
      },
    };
    f.researcher.run.mockResolvedValueOnce({
      bot: candidate,
      settings: {},
      research: {},
      denomination: {},
      candidates: 3,
    } as AutopilotResult);
    f.trading.prepareLiveBot.mockImplementationOnce(async (template) => ({
      ...template,
      id: 'review',
      mode: 'live',
    }));

    await f.state.go(f.input);
    expect(f.researcher.run).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
    f.input.capital = '999';
    f.input.feeBudgetXor = '99';
    f.input.maxLossPercent = '99';
    f.reportAgentConnected();
    await flushPromises();

    expect(f.researcher.run.mock.calls[0][0]).toMatchObject({
      capital: '10',
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      feeBudgetXor: '1',
      targetReturnPercent: '5',
      maxLossPercent: '10',
      valuationAsset: 'output',
    });
    expect(f.trading.prepareLiveBot).toHaveBeenCalledWith(candidate, expect.anything(), expect.anything());
    expect(f.state.stage.value).toBe('review');
    expect(f.state.reviewBot.value).toMatchObject({
      assetIn: assets[0],
      assetOut: assets[1],
      strategy: { amount: '2' },
      policy: {
        maxPriceImpactPercent: '1',
        feeBudgetCodec: toCodec('1', 18),
      },
      goal: { targetReturnPercent: '5', maxLossPercent: '10', valuationAsset: 'output', lossMetric: 'drawdown' },
    });
    expect(candidate.portfolio.initial).toEqual({
      [GOAL_EXACT_KUSD]: toCodec('10', 18),
      [GOAL_EXACT_XOR]: toCodec('1', 18),
    });
    expect(candidate.policy.maxTradeCodec[GOAL_EXACT_KUSD]).toBe(toCodec('2', 18));
    expect(f.trading.previewLiveFunding).toHaveBeenCalledWith('review');
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();

    const unlock = { password: 'fixture-only' };
    await f.state.start(unlock);
    expect(unlock.password).toBe('');
    expect(f.trading.saveLiveBot).toHaveBeenCalledOnce();
    expect(f.trading.startBot).toHaveBeenCalledExactlyOnceWith('review', {
      password: 'fixture-only',
      expectedConnection: 'wallet-one',
    });
  });
  it('keeps unmatched budgets exact when routing to research', async () => {
    const f = setup(true);
    await f.state.go({ ...f.input, capital: '11' });
    expect(f.trading.prepareGoalReview).not.toHaveBeenCalled();
    expect(f.desktopAi).toHaveBeenCalled();
    f.reportAgentConnected();
    await flushPromises();
    expect(f.researcher.run.mock.calls[0][0]).toMatchObject({ capital: '11', feeBudgetXor: '1' });
  });
  it('waits for wallet connection before starting research on an exact v1-shaped input', async () => {
    const f = setup(true);
    f.trading.walletConnected.value = false;
    await f.state.go(f.input);
    expect(f.trading.prepareGoalReview).not.toHaveBeenCalled();
    expect(f.requestWallet).toHaveBeenCalledOnce();
    f.trading.walletConnected.value = true;
    await flushPromises();
    expect(f.desktopAi).toHaveBeenCalledOnce();
    f.reportAgentConnected();
    await flushPromises();
    expect(f.trading.prepareGoalReview).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledOnce();
  });
  it('discards a resumed exact v1 review returned after cancel or wallet change without allocating', async () => {
    const f = setup(true);
    const bot = { ...goalStorageBot(), id: 'review', status: 'paused' as const };
    f.trading.bots.value = [bot];
    let finish!: (value: Awaited<ReturnType<typeof f.trading.prepareGoalReview>>) => void;
    f.trading.resumeGoalReview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = f.state.resume(bot.id);
    await flushPromises();
    f.state.cancel();
    finish({ bot: f.draft, funding: { sufficient: true, assets: [] }, draftId: 'stable-goal-draft' });
    await pending;
    expect(f.trading.discardGoalReview).toHaveBeenCalledWith('review');
    expect(f.trading.approveGoalReview).not.toHaveBeenCalled();
    await f.state.resume(bot.id);
    f.trading.connectionIdentity.value = 'changed';
    await flushPromises();
    expect(f.state.reviewBot.value).toBeNull();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });
  it('refreshes the same exact draft after stale approval and never falls back to legacy save', async () => {
    const f = setup(true);
    const bot = { ...goalStorageBot(), id: 'review', status: 'paused' as const };
    f.trading.bots.value = [bot];
    await f.state.resume(bot.id);
    f.trading.approveGoalReview.mockRejectedValueOnce(Error('bots.errors.stale'));
    await f.state.start({ password: 'personal-unlock' });
    expect(f.state.funding.value).toBeNull();
    await f.state.refreshFunding();
    expect(f.trading.refreshGoalReview).toHaveBeenCalledWith(
      'review',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await f.state.start({ password: 'new-unlock' });
    expect(f.state.stage.value).toBe('running');
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
  });
  it('cancellation during exact approval cannot start a late returned funded bot', async () => {
    const f = setup(true);
    const bot = { ...goalStorageBot(), id: 'review', status: 'paused' as const };
    f.trading.bots.value = [bot];
    await f.state.resume(bot.id);
    let finish!: (value: ReturnType<typeof goalStorageBot>) => void;
    f.trading.approveGoalReview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = f.state.start({ password: 'personal-unlock' });
    await flushPromises();
    f.state.cancel();
    finish({ ...goalStorageBot(), id: 'review' });
    await pending;
    expect(f.trading.discardGoalReview).toHaveBeenCalledWith('review');
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });
  it('requires a fresh exact resume review and refuses an unavailable release without resetting stored state', async () => {
    const f = setup(true),
      bot = { ...goalStorageBot(), id: 'review', status: 'paused' as const };
    f.trading.bots.value = [bot];
    f.trading.resumeGoalReview.mockRejectedValueOnce(Error('bots.errors.research'));
    await f.state.resume(bot.id);
    expect(f.state.error.value).toBe('bots.autopilot.errors.research');
    expect(f.state.reviewBot.value).toBeNull();
    expect(f.trading.startBot).not.toHaveBeenCalled();
    expect(f.trading.bots.value[0]).toEqual(bot);
    await f.state.resume(bot.id);
    expect(f.state.stage.value).toBe('review');
    expect(f.trading.approveGoalReview).not.toHaveBeenCalled();
    await f.state.start({ password: 'resume-unlock' });
    expect(f.trading.approveGoalReview).toHaveBeenCalledWith(bot.id);
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
  });
});

describe('unsigned opportunity watching', () => {
  const HOUR = 3_600_000;
  const completedThrough = Date.parse('2026-09-22T06:00:00Z');
  const validationFrom = completedThrough - 49 * HOUR;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(completedThrough + 5 * 60_000);
    sessionStorage.clear();
    // The separately tested one-second host-discovery timer is unrelated to opportunity scheduling.
    vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0 as unknown as ReturnType<typeof setInterval>);
  });
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** Drive only trusted lifecycle callbacks; no history, quote, AI or wallet service is contacted. */
  async function startWatching(phase: 'opening' | 'training' | 'validation' | 'quote' = 'training', desktop = false) {
    const f = setup(false, true);
    Object.assign(f.input, {
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
    });
    f.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    if (desktop) {
      await f.state.connectDesktop();
      f.reportAgentConnected();
    } else await f.connect();
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      if (phase === 'opening')
        throw createAutopilotOpeningError({
          lossPercent: '6',
          maxLossPercent: '5',
          valuationSymbol: 'XOR',
          openedAt: completedThrough - 167 * HOUR,
          firstTradeAt: completedThrough - 166 * HOUR,
        });
      if (phase === 'quote') throw new Error('bots.errors.quote');
      if (phase === 'validation') await f.reportValidation(validationFrom, completedThrough);
      throw createAutopilotQualificationError(phase, [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await f.state.research(f.input);
    return f;
  }

  /** Use the controller's real identity shape so a node-only outage can be distinguished from authority changes. */
  async function startStructuredDesktopWatch() {
    const genesis = `0x${'ab'.repeat(32)}`;
    const endpoint = 'wss://same-node';
    const connected = JSON.stringify([true, 'tc1-public-address', 'polkadot-js', true, genesis, endpoint, 130]);
    const disconnected = JSON.stringify([true, 'tc1-public-address', 'polkadot-js', false, genesis, endpoint, 130]);
    const connectedNetwork = JSON.stringify([true, genesis, endpoint, 130]);
    const disconnectedNetwork = JSON.stringify([false, genesis, endpoint, 130]);
    const f = setup(false, true);
    Object.assign(f.input, { assetInAddress: GOAL_EXACT_KUSD, assetOutAddress: GOAL_EXACT_XOR, capital: '10' });
    f.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    f.trading.connectionIdentity.value = connected;
    f.trading.readNetworkIdentity.mockReturnValue(connectedNetwork);
    await f.state.connectDesktop();
    f.reportAgentConnected();
    await f.state.pairCompanion('test-only-code');
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await f.state.research(f.input);
    expect(f.state.stage.value).toBe('watching');
    return { ...f, connected, disconnected, connectedNetwork, disconnectedNetwork, genesis, endpoint };
  }

  it('rearms the paired unsigned watch after an exact node-only disconnect and refreshes exposure and readiness', async () => {
    const f = await startStructuredDesktopWatch();
    const exposureReads = vi.mocked(f.exposureStore.read).mock.calls.length;
    vi.setSystemTime(completedThrough + HOUR + 10_000);
    f.trading.readNetworkIdentity.mockReturnValue(f.disconnectedNetwork);
    f.trading.connectionIdentity.value = f.disconnected;
    await flushPromises();
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.state.companionConnected.value).toBe(true);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();

    f.trading.readNetworkIdentity.mockReturnValue(f.connectedNetwork);
    f.trading.connectionIdentity.value = f.connected;
    await flushPromises();
    expect(f.state.stage.value).toBe('watching');
    expect(f.exposureStore.read).toHaveBeenCalledTimes(exposureReads + 1);
    await vi.advanceTimersByTimeAsync(0);
    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it.each(['wallet', 'chain', 'endpoint', 'runtime'] as const)(
    'does not auto-rearm an unsigned watch after a %s change',
    async (change) => {
      const f = await startStructuredDesktopWatch();
      f.trading.readNetworkIdentity.mockReturnValue(f.disconnectedNetwork);
      f.trading.connectionIdentity.value = f.disconnected;
      await flushPromises();
      expect(f.state.stage.value).toBe('fund');

      const address = change === 'wallet' ? 'other-public-address' : 'tc1-public-address';
      const genesis = change === 'chain' ? `0x${'cd'.repeat(32)}` : f.genesis;
      const endpoint = change === 'endpoint' ? 'wss://other-node' : f.endpoint;
      const version = change === 'runtime' ? 131 : 130;
      f.trading.readNetworkIdentity.mockReturnValue(JSON.stringify([true, genesis, endpoint, version]));
      f.trading.connectionIdentity.value = JSON.stringify([
        true,
        address,
        'polkadot-js',
        true,
        genesis,
        endpoint,
        version,
      ]);
      await flushPromises();
      await vi.advanceTimersByTimeAsync(HOUR);
      expect(f.state.stage.value).toBe('fund');
      expect(f.state.watchNextCheckAt.value).toBeNull();
      expect(f.readResearchReadiness).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();

      f.trading.readNetworkIdentity.mockReturnValue(f.connectedNetwork);
      f.trading.connectionIdentity.value = f.connected;
      await flushPromises();
      expect(f.state.stage.value).toBe('fund');
      expect(f.readResearchReadiness).not.toHaveBeenCalled();
    }
  );

  it('does not auto-rearm after the wallet disconnects during a node outage', async () => {
    const f = await startStructuredDesktopWatch();
    f.trading.readNetworkIdentity.mockReturnValue(f.disconnectedNetwork);
    f.trading.connectionIdentity.value = f.disconnected;
    await flushPromises();
    f.trading.walletConnected.value = false;
    await flushPromises();
    f.trading.walletConnected.value = true;
    f.trading.readNetworkIdentity.mockReturnValue(f.connectedNetwork);
    f.trading.connectionIdentity.value = f.connected;
    await flushPromises();
    expect(f.state.stage.value).toBe('fund');
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
  });

  it('does not auto-rearm a checkpoint in a new page instance after reload', async () => {
    const f = await startStructuredDesktopWatch();
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, f.exposureStore);
    reloaded.trading.assets.value = [...f.trading.assets.value];
    reloaded.trading.connectionIdentity.value = f.connected;
    reloaded.trading.readNetworkIdentity.mockReturnValue(f.connectedNetwork);
    await flushPromises();
    expect(reloaded.state.canResumeWatch.value).toBe(true);
    expect(reloaded.state.stage.value).toBe('welcome');
    expect(reloaded.state.watchNextCheckAt.value).toBeNull();
    expect(reloaded.readResearchReadiness).not.toHaveBeenCalled();
  });

  it.each(['focus', 'pageshow', 'visibilitychange'] as const)(
    'checks one overdue hour when a suspended page receives %s',
    async (event) => {
      const f = await startWatching();
      window.dispatchEvent(new Event('focus'));
      expect(f.readResearchReadiness).not.toHaveBeenCalled();

      vi.setSystemTime(completedThrough + HOUR + 10_000);
      (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('pageshow'));
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();

      expect(f.readResearchReadiness).toHaveBeenCalledOnce();
      expect(f.state.stage.value).toBe('watching');
      expect(f.state.watchNextCheckAt.value).toBe(Date.now() + 60_000);
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(60_000);
      expect(f.readResearchReadiness).toHaveBeenCalledTimes(2);
    }
  );

  it('does not wake a hidden or unmounted watch', async () => {
    const f = await startWatching();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.setSystemTime(completedThrough + HOUR + 10_000);
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    expect(f.readResearchReadiness).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    wrappers.pop()!.unmount();
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
  });

  it('keeps an initially unquotable GO watching and retries only after a new completed hour', async () => {
    const f = setup(false, true);
    await f.connect();
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      throw new Error('bots.errors.quote');
    });
    await f.state.go(f.input);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.error.value).toBe('bots.errors.quote');
    expect(f.state.diagnostics.value).toBeNull();
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + HOUR);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(1);

    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR);
      throw new Error('bots.errors.quote');
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.error.value).toBe('bots.errors.quote');
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    await vi.advanceTimersByTimeAsync(59 * 60_000);
    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  /** Expire only an already-prepared public desktop request, with no market or wallet calls. */
  async function expireDesktopRequest(automatic = false) {
    const f = automatic ? await startWatching('training', true) : setup(false, true);
    const end = completedThrough + (automatic ? HOUR : 0);
    if (!automatic) {
      Object.assign(f.input, { assetInAddress: GOAL_EXACT_KUSD, assetOutAddress: GOAL_EXACT_XOR, capital: '10' });
      await f.state.connectDesktop();
      f.reportAgentConnected();
    }
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(end);
      throw new Error('bots.codex.expired');
    });
    if (automatic) {
      f.readResearchReadiness.mockResolvedValue({ completedThrough: end, validationFrom: end - 49 * HOUR });
      await vi.advanceTimersByTimeAsync(55 * 60_000);
    } else await f.state.research(f.input);
    return { ...f, end };
  }

  it.each([false, true])(
    'refreshes an expired desktop request with exact retained input (automatic=%s)',
    async (automatic) => {
      const f = await expireDesktopRequest(automatic);
      expect(f.state.stage.value).toBe('watching');
      expect(f.state.canRefreshDesktopRequest.value).toBe(true);
      const before = f.researcher.run.mock.calls.length;
      const oldSignal = f.researcher.run.mock.calls.at(-1)![2]!;
      const result = await f.researcher.run.getMockImplementation()!(f.input, f.desktopClient);
      let finish!: (value: AutopilotResult) => void;
      f.researcher.run.mockImplementationOnce(async () => {
        f.reportHistory(f.end);
        return new Promise((resolve) => (finish = resolve));
      });
      f.input.capital = '999';
      f.input.feeBudgetXor = '99';
      const refreshing = f.state.refreshDesktopRequest();
      expect(f.state.stage.value).toBe('research');
      expect(f.state.canRefreshDesktopRequest.value).toBe(false);
      expect(f.state.watchNextCheckAt.value).toBeNull();
      expect(oldSignal.aborted).toBe(true);
      await f.state.refreshDesktopRequest();
      await flushPromises();
      expect(f.researcher.run).toHaveBeenCalledTimes(before + 1);
      expect(f.researcher.run.mock.calls.at(-1)![0]).toMatchObject({
        capital: '10',
        feeBudgetXor: '1',
        assetInAddress: GOAL_EXACT_KUSD,
        assetOutAddress: GOAL_EXACT_XOR,
        targetReturnPercent: '5',
        maxLossPercent: '5',
      });
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      finish(result);
      await refreshing;
      expect(f.state.stage.value).toBe('review');
      expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it('requires a new confirmed real mailbox response after expiry and rejects the old request ID', async () => {
    const f = setup(false, true, true);
    await f.state.connectDesktop();
    await f.state.acknowledgeDesktop(f.state.desktopConnectionId.value);
    const result = await f.researcher.run.getMockImplementation()!(f.input, f.desktopClient);
    const bot = botFixture();
    Object.assign(bot, { account: 'paper', network: 'paper' });
    bot.strategy.prompt = 'Use these synthetic training candles.';
    const strategy = { ...bot.strategy, intervalMs: HOUR, prompt: '' };
    f.researcher.run.mockImplementation(async (_input, ai, signal) => {
      f.reportHistory(completedThrough);
      await (ai as BotAiClient).suggest(bot, [{ timestamp: completedThrough, close: '2', feeClose: '1' }], signal);
      return result;
    });
    const first = f.state.research(f.input);
    await flushPromises();
    const oldId = JSON.parse(f.state.desktopContext.value).requestId;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await first;
    expect(f.state.canRefreshDesktopRequest.value).toBe(true);
    const refreshed = f.state.refreshDesktopRequest();
    await flushPromises();
    const newId = JSON.parse(f.state.desktopContext.value).requestId;
    expect(newId).not.toBe(oldId);
    expect(f.state.desktopPending.value).toBe(true);
    await f.state.submitDesktopDraft(JSON.stringify({ requestId: oldId, strategy }));
    expect(f.state.desktopPending.value).toBe(true);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    await f.state.submitDesktopDraft(JSON.stringify({ requestId: newId, strategy }));
    await refreshed;
    expect(f.state.desktopPending.value).toBe(false);
    expect(f.state.stage.value).toBe('review');
    expect(f.trading.prepareLiveBot).toHaveBeenCalledOnce();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('refuses older prepared history during explicit refresh and leaves automatic retries on a later hour', async () => {
    const f = await expireDesktopRequest(true);
    let drafted = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(f.end - HOUR);
      drafted = true;
      throw new Error('unreachable');
    });
    await f.state.refreshDesktopRequest();
    expect(drafted).toBe(false);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.error.value).toBe('bots.errors.stale');
    expect(f.state.canRefreshDesktopRequest.value).toBe(false);
    expect(f.state.watchNextCheckAt.value).toBe(f.end + HOUR);
    await vi.advanceTimersByTimeAsync(59 * 60_000);
    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it('keeps another refreshed expiry on the same verified hour without an automatic same-hour retry', async () => {
    const f = await expireDesktopRequest();
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(f.end);
      throw new Error('bots.codex.expired');
    });
    await f.state.refreshDesktopRequest();
    expect(f.state.canRefreshDesktopRequest.value).toBe(true);
    expect(f.state.watchNextCheckAt.value).toBe(f.end + HOUR);
    await vi.advanceTimersByTimeAsync(54 * 60_000);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it.each(['api-client', 'unprepared-history'] as const)(
    'does not retain an initial %s expiry for refresh',
    async (condition) => {
      const f = setup(false, true);
      if (condition === 'api-client') await f.connect();
      else {
        await f.state.connectDesktop();
        f.reportAgentConnected();
      }
      f.researcher.run.mockImplementationOnce(async () => {
        if (condition === 'api-client') f.reportHistory(completedThrough);
        throw new Error('bots.codex.expired');
      });
      await f.state.research(f.input);
      expect(f.state.stage.value).toBe('fund');
      expect(f.state.canRefreshDesktopRequest.value).toBe(false);
      await f.state.refreshDesktopRequest();
      expect(f.researcher.run).toHaveBeenCalledOnce();
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    }
  );

  it.each(['opening', 'training', 'validation'] as const)(
    'does not refresh a %s qualification failure',
    async (phase) => {
      const f = await startWatching(phase, true);
      expect(f.state.canRefreshDesktopRequest.value).toBe(false);
      await f.state.refreshDesktopRequest();
      expect(f.researcher.run).toHaveBeenCalledOnce();
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    }
  );

  it.each([
    'cancel-budget-edit',
    'wallet-change',
    'wallet-disconnect',
    'network-change',
    'desktop-disconnect',
  ] as const)('rechecks %s before an expired-request refresh', async (change) => {
    const f = await expireDesktopRequest();
    expect(f.state.canRefreshDesktopRequest.value).toBe(true);
    if (change === 'cancel-budget-edit') {
      f.state.cancel();
      f.input.capital = '9';
    }
    if (change === 'wallet-change') f.trading.connectionIdentity.value = 'wallet-two';
    if (change === 'wallet-disconnect') f.trading.walletConnected.value = false;
    if (change === 'network-change') f.trading.readNetworkIdentity.mockReturnValue('network-two');
    if (change === 'desktop-disconnect') f.state.disconnectDesktop();
    // No nextTick: activation itself must recheck even if the rendered computed button is cached.
    await f.state.refreshDesktopRequest();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('ignores a late refreshed response after cancellation without creating or authorizing a review', async () => {
    const f = await expireDesktopRequest();
    const result = await f.researcher.run.getMockImplementation()!(f.input, f.desktopClient);
    let finish!: (value: AutopilotResult) => void;
    f.researcher.run.mockImplementationOnce(async () => new Promise((resolve) => (finish = resolve)));
    const pending = f.state.refreshDesktopRequest();
    await flushPromises();
    const signal = f.researcher.run.mock.calls.at(-1)![2]!;
    f.state.cancel();
    expect(signal.aborted).toBe(true);
    finish(result);
    await pending;
    expect(f.state.canRefreshDesktopRequest.value).toBe(false);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('never refreshes a desktop expiry after validation has already been exposed', async () => {
    const f = await startWatching('training', true);
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR);
      await f.reportValidation(validationFrom + HOUR, completedThrough + HOUR);
      throw new Error('bots.codex.expired');
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.error.value).toBe('bots.codex.expired');
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.canRefreshDesktopRequest.value).toBe(false);
    await f.state.refreshDesktopRequest();
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 51 * HOUR);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it.each(['opening', 'training', 'validation'] as const)(
    'retains the exact unsigned allocation and AI connection after trusted %s rejection',
    async (phase) => {
      const f = await startWatching(phase);
      expect(f.state.stage.value).toBe('watching');
      expect(f.state.watching.value).toBe(true);
      expect(f.state.busy.value).toBe(false);
      expect(f.state.error.value).toBe(`bots.autopilot.errors.${phase}Rejected`);
      expect(f.state.diagnostics.value?.stage).toBe(phase);
      expect(f.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
      expect(f.state.reviewBot.value).toBeNull();
      expect(f.state.funding.value).toBeNull();
      expect(f.input).toMatchObject({ capital: '10', feeBudgetXor: '1', maxLossPercent: '5' });
      expect(f.client.disconnect).not.toHaveBeenCalled();
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.previewLiveFunding).not.toHaveBeenCalled();
      expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
      expect(f.state.watchNextCheckAt.value).toBe(completedThrough + (phase === 'validation' ? 50 : 1) * HOUR);
    }
  );

  it('waits for a new indexed completed hour, preserves the snapshot and enters only unsigned review', async () => {
    const f = await startWatching();
    f.input.capital = '999';
    f.input.feeBudgetXor = '99';
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000 - 1);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
    expect(f.readResearchReadiness.mock.calls[0][0]).toMatchObject({
      capital: '10',
      feeBudgetXor: '1',
      maxLossPercent: '5',
    });
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.researcher.run.mock.calls[1][0]).toMatchObject({ capital: '10', feeBudgetXor: '1', maxLossPercent: '5' });
    expect(f.state.stage.value).toBe('review');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.trading.prepareLiveBot).toHaveBeenCalledOnce();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('waits for a fresh desktop draft at the next hour and returns to unsigned watching after expiry', async () => {
    const f = setup(false, true, true);
    Object.assign(f.input, {
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
    });
    await f.state.connectDesktop();
    await f.state.acknowledgeDesktop(f.state.desktopConnectionId.value);
    const desktop = await f.desktopAi.mock.results[0].value;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await f.state.research(f.input);
    expect(f.state.stage.value).toBe('watching');

    const nextHour = completedThrough + HOUR;
    f.readResearchReadiness.mockResolvedValue({ completedThrough: nextHour, validationFrom: validationFrom + HOUR });
    const bot = botFixture();
    Object.assign(bot, { account: 'paper', network: 'paper' });
    bot.strategy.prompt = 'Use only these synthetic training candles.';
    f.researcher.run.mockImplementationOnce(async (_input, ai, signal) => {
      f.reportHistory(nextHour, validationFrom + HOUR);
      await (ai as BotAiClient).suggest(bot, [{ timestamp: nextHour, close: '2', feeClose: '1' }], signal);
      throw new Error('unreachable without an assistant draft');
    });

    await vi.advanceTimersByTimeAsync(55 * 60_000);
    await flushPromises();
    expect(f.state.stage.value).toBe('research');
    expect(f.state.desktopPending.value).toBe(true);
    expect(desktop.getStatus()).toMatchObject({ state: 'awaiting_draft', connected: true });
    expect(desktop.readContext().trainingCutoff).toBe(nextHour);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.previewLiveFunding).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.desktopPending.value).toBe(false);
    expect(f.state.error.value).toBe('bots.codex.expired');
    expect(f.state.canRefreshDesktopRequest.value).toBe(true);
    expect(f.state.watchNextCheckAt.value).toBe(nextHour + HOUR);
    expect(desktop.getStatus()).toMatchObject({ state: 'watching', connected: true });
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it.each(['missing', 'same-hour', 'future', 'inverted', 'read-error'] as const)(
    'keeps %s readiness unsigned and polls no faster than once per minute',
    async (condition) => {
      const f = await startWatching();
      if (condition === 'read-error') f.readResearchReadiness.mockRejectedValue(new Error('offline'));
      else if (condition === 'same-hour')
        f.readResearchReadiness.mockResolvedValue({ completedThrough, validationFrom });
      else if (condition === 'future')
        f.readResearchReadiness.mockResolvedValue({ completedThrough: completedThrough + 2 * HOUR, validationFrom });
      else if (condition === 'inverted')
        f.readResearchReadiness.mockResolvedValue({ completedThrough, validationFrom: completedThrough + HOUR });
      await vi.advanceTimersByTimeAsync(55 * 60_000);
      expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
      expect(f.researcher.run).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(59_999);
      expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(f.readResearchReadiness).toHaveBeenCalledTimes(2);
      expect(f.state.stage.value).toBe('watching');
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it('never overlaps readiness reads and ignores an aborted late response after cancel', async () => {
    const f = await startWatching();
    let resolve!: (ready: { completedThrough: number; validationFrom: number }) => void;
    f.readResearchReadiness.mockImplementation(() => new Promise((done) => (resolve = done)));
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
    const signal = f.readResearchReadiness.mock.calls[0][1];
    f.state.cancel();
    expect(signal.aborted).toBe(true);
    resolve({ completedThrough: completedThrough + HOUR, validationFrom: validationFrom + HOUR });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it.each(['wallet-change', 'wallet-disconnect', 'unmount'] as const)('revokes watching on %s', async (action) => {
    const f = await startWatching();
    if (action === 'wallet-change') f.trading.connectionIdentity.value = 'wallet-two';
    else if (action === 'wallet-disconnect') f.trading.walletConnected.value = false;
    else wrappers.pop()!.unmount();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).not.toBeNull();
  });

  it('pauses a watch under another wallet and resumes only after the original wallet returns', async () => {
    const f = await startWatching();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const checkpoint = sessionStorage.getItem(key);

    f.trading.connectionIdentity.value = 'wallet-two';
    await flushPromises();
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.state.recoverableWatchInput.value).toBeNull();
    expect(sessionStorage.getItem(key)).toBe(checkpoint);

    await f.state.resumeWatch();
    expect(f.state.stage.value).toBe('fund');
    expect(sessionStorage.getItem(key)).toBe(checkpoint);
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(1);

    f.trading.connectionIdentity.value = 'wallet-one';
    await flushPromises();
    expect(f.state.recoverableWatchInput.value).toMatchObject({
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
    });
    await f.state.resumeWatch();
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.watchNextCheckAt.value).toBe(Date.now());
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('reports desktop watching without replacing the connection and disconnect revokes the timer', async () => {
    const f = await startWatching('training', true);
    const readProgress = f.desktopAi.mock.calls[0][0]!.readProgress!;
    expect(readProgress()).toEqual({
      state: 'watching',
      errorKey: 'bots.autopilot.errors.trainingRejected',
      diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: ['netLoss'] }] },
    });
    expect(f.state.desktopConnected.value).toBe(true);
    expect(f.desktopClient.disconnect).not.toHaveBeenCalled();
    f.state.disconnectDesktop();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.desktopClient.disconnect).toHaveBeenCalledOnce();
  });

  it('requires a wholly new reserved window after validation, without polling the overlapping hours', async () => {
    const f = await startWatching('validation');
    const eligibleEnd = completedThrough + 50 * HOUR;
    f.readResearchReadiness.mockResolvedValue({ completedThrough: eligibleEnd, validationFrom: completedThrough });
    await vi.advanceTimersByTimeAsync(eligibleEnd - Date.now() - 1);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: eligibleEnd,
      validationFrom: completedThrough + HOUR,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.state.stage.value).toBe('review');
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('retains validation exposure through cancel and same-pair budget edits before another manual attempt', async () => {
    const f = await startWatching('validation');
    expect(f.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    f.state.cancel();
    expect(f.state.diagnosticsCompletedThrough.value).toBeNull();
    f.input.capital = '9';
    let validationDispatched = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      await f.reportValidation(validationFrom, completedThrough);
      validationDispatched = true;
      throw new Error('unreachable');
    });
    await f.state.research(f.input);
    expect(validationDispatched).toBe(false);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.error.value).toBe('bots.autopilot.errors.validationRejected');
    expect(f.state.diagnostics.value?.stage).toBe('validation');
    expect(f.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('dates reused validation diagnostics to the exposed hour rather than a newer prepared retry', async () => {
    const f = await startWatching('validation');
    vi.setSystemTime(completedThrough + HOUR + 5 * 60_000);
    f.state.cancel();
    expect(f.state.diagnosticsCompletedThrough.value).toBeNull();
    let drafted = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR, validationFrom);
      drafted = true;
      throw new Error('unreachable');
    });
    await f.state.research(f.input);
    expect(drafted).toBe(false);
    expect(f.state.diagnostics.value?.stage).toBe('validation');
    expect(f.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 50 * HOUR);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('refuses the same holdout after the Bots view is recreated', async () => {
    const shared = memoryExposureStore();
    const first = setup(false, true, false, shared);
    await first.connect();
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough);
      await first.reportValidation(validationFrom, completedThrough);
      throw createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await first.state.research(first.input);
    expect(first.state.stage.value).toBe('watching');
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, shared);
    await reloaded.connect();
    let dispatched = false;
    reloaded.researcher.run.mockImplementationOnce(async () => {
      reloaded.reportHistory(completedThrough);
      dispatched = true;
      throw Error('holdout must remain quarantined');
    });
    await reloaded.state.research(reloaded.input);
    expect(dispatched).toBe(false);
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.diagnostics.value).toEqual({
      stage: 'validation',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 50 * HOUR);
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it('restores the exact validation reasons and original data hour after an explicit reload resume', async () => {
    const first = await startWatching('validation');
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    expect(reloaded.state.diagnostics.value).toBeNull();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.diagnostics.value).toEqual({
      stage: 'validation',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
  });

  it.each([
    ['opening', 'bots.autopilot.errors.openingRejected'],
    ['quote', 'bots.errors.quote'],
  ] as const)('restores a bounded %s failure after same-tab watch reload', async (phase, errorKey) => {
    const first = await startWatching(phase);
    expect(first.state.stage.value).toBe('watching');
    const stored = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
    expect(stored.lastFailure).toMatchObject({ errorKey, completedThrough });
    expect(JSON.stringify(stored.lastFailure)).not.toMatch(
      /lossPercent|openedAt|firstTradeAt|feePressure|provider message/i
    );
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.error.value).toBe(errorKey);
    expect(reloaded.state.diagnostics.value).toBeNull();
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('retains an observed impact-only hour, resumes unsigned after reload and recovers only on newer readiness', async () => {
    const first = setup(false, true);
    Object.assign(first.input, {
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
      feeBudgetXor: '1',
      maxLossPercent: '10',
      targetReturnPercent: '5',
      valuationAsset: 'output',
    });
    first.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    await first.connect();
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough);
      throw createAutopilotImpactPreflightError();
    });
    await first.state.research(first.input);
    expect(first.state.stage.value).toBe('watching');
    expect(first.state.error.value).toBe(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE);
    expect(first.state.diagnostics.value).toBeNull();
    expect(first.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    const stored = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
    expect(stored.input).toEqual(first.input);
    expect(stored.lastFailure).toMatchObject({
      errorKey: AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
      completedThrough,
      preflight: { stage: 'preflight', cause: 'priceImpact', sampleCount: 5 },
    });
    expect(JSON.stringify(stored)).not.toMatch(
      /amountIn|networkFee|priceImpactPercent|blockHash|provider message|password/i
    );
    expect(first.exposureStore.reserve).not.toHaveBeenCalled();
    expect(first.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(first.trading.startBot).not.toHaveBeenCalled();
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.error.value).toBe(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE);
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    const nextHour = completedThrough + HOUR;
    reloaded.readResearchReadiness.mockResolvedValueOnce({ completedThrough, validationFrom });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    reloaded.readResearchReadiness.mockResolvedValueOnce({
      completedThrough: nextHour,
      validationFrom: validationFrom + HOUR,
    });
    reloaded.researcher.run.mockImplementationOnce(async (actual) => {
      expect(actual).toMatchObject(first.input);
      reloaded.reportHistory(nextHour, validationFrom + HOUR);
      throw createAutopilotImpactPreflightError();
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(nextHour);
    expect(reloaded.state.watchNextCheckAt.value).toBe(nextHour + HOUR);
    reloaded.readResearchReadiness.mockResolvedValueOnce({
      completedThrough: nextHour + HOUR,
      validationFrom: validationFrom + 2 * HOUR,
    });
    await vi.advanceTimersByTimeAsync(HOUR - 60_000);
    expect(reloaded.state.stage.value).toBe('review');
    expect(reloaded.researcher.run).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
    expect(reloaded.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps a peer holdout reservation authoritative after an observed impact-only failure', async () => {
    const f = await startWatching();
    const nextHour = completedThrough + HOUR;
    f.readResearchReadiness.mockResolvedValueOnce({
      completedThrough: nextHour,
      validationFrom: validationFrom + HOUR,
    });
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(nextHour, validationFrom + HOUR);
      throw createAutopilotImpactPreflightError();
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.error.value).toBe(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE);
    const key = vi.mocked(f.exposureStore.read).mock.calls[0][0];
    await f.exposureStore.reserve(key, { from: validationFrom + HOUR, to: nextHour });
    await vi.advanceTimersByTimeAsync(HOUR);
    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.diagnosticsCompletedThrough.value).toBe(nextHour);
    expect(f.state.watchNextCheckAt.value).toBe(nextHour + 50 * HOUR);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it.each(['bots.errors.policy', 'bots.errors.config', 'bots.errors.goal'])(
    'stops an untrusted %s failure even with lookalike impact properties and a completed hour',
    async (errorKey) => {
      const f = setup(false, true);
      await f.connect();
      f.researcher.run.mockImplementationOnce(async () => {
        f.reportHistory(completedThrough);
        throw Object.assign(new Error(errorKey), {
          preflight: { stage: 'preflight', cause: 'priceImpact', sampleCount: 5 },
        });
      });
      await f.state.research(f.input);
      expect(f.state.stage.value).toBe('fund');
      expect(f.state.error.value).toBe(errorKey);
      expect(f.state.diagnosticsCompletedThrough.value).toBeNull();
      expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it('never assigns a wall-clock hour to trusted impact failure without prepared history', async () => {
    const f = setup(false, true);
    await f.connect();
    f.researcher.run.mockRejectedValueOnce(createAutopilotImpactPreflightError());
    await f.state.research(f.input);
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.diagnosticsCompletedThrough.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps an unaffordable exact fee as a dated watch result and recovers on the next verified hour', async () => {
    const first = await startWatching();
    const nextHour = completedThrough + HOUR;
    const recoveredHour = nextHour + HOUR;
    first.readResearchReadiness.mockResolvedValueOnce({
      completedThrough: nextHour,
      validationFrom: validationFrom + HOUR,
    });
    first.readResearchReadiness.mockResolvedValueOnce({
      completedThrough: recoveredHour,
      validationFrom: validationFrom + 2 * HOUR,
    });
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(nextHour, validationFrom + HOUR);
      throw createAutopilotFeeBudgetError();
    });
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(recoveredHour, validationFrom + 2 * HOUR);
      return { bot: botFixture(), settings: {}, research: {}, denomination: {}, candidates: 3 } as AutopilotResult;
    });

    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(first.state.stage.value).toBe('watching');
    expect(first.state.error.value).toBe('bots.autopilot.errors.insufficientFeeBudget');
    expect(first.state.diagnosticsCompletedThrough.value).toBe(nextHour);
    expect(first.state.watchNextCheckAt.value).toBe(recoveredHour);
    const stored = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
    expect(stored.lastFailure).toMatchObject({
      errorKey: 'bots.autopilot.errors.insufficientFeeBudget',
      completedThrough: nextHour,
    });
    expect(JSON.stringify(stored)).not.toMatch(/networkFee|amountOut|feePressure|provider message|apiKey/i);
    await vi.advanceTimersByTimeAsync(HOUR - 1);
    expect(first.readResearchReadiness).toHaveBeenCalledOnce();
    expect(first.researcher.run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(first.state.stage.value).toBe('review');
    expect(first.readResearchReadiness).toHaveBeenCalledTimes(2);
    expect(first.researcher.run).toHaveBeenCalledTimes(3);
    expect(first.state.watchNextCheckAt.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
    expect(first.trading.startBot).not.toHaveBeenCalled();
  });

  it('restores a fee-budget watch without repeating the failed hour after reload', async () => {
    const first = await startWatching();
    const nextHour = completedThrough + HOUR;
    first.readResearchReadiness.mockResolvedValue({
      completedThrough: nextHour,
      validationFrom: validationFrom + HOUR,
    });
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(nextHour, validationFrom + HOUR);
      throw createAutopilotFeeBudgetError();
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    expect(reloaded.state.stage.value).toBe('fund');
    expect(reloaded.state.canResumeWatch.value).toBe(true);
    expect(reloaded.state.recoverableWatchInput.value).toMatchObject(first.input);
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.error.value).toBe('bots.autopilot.errors.insufficientFeeBudget');
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(nextHour);
    expect(reloaded.state.watchNextCheckAt.value).toBe(nextHour + HOUR);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(HOUR - 1);
    expect(reloaded.readResearchReadiness).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledOnce();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.state.stage.value).toBe('watching');
    reloaded.state.cancel();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
  });

  it('does not checkpoint a provider-shaped fee error, even after verified history', async () => {
    const f = setup(false, true);
    await f.connect();
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      throw new Error('bots.autopilot.errors.insufficientFeeBudget');
    });
    await f.state.research(f.input);
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.canResumeWatch.value).toBe(false);
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
  });

  it('prefers a same-hour training diagnosis over an older pre-draft error', async () => {
    const first = await startWatching('training');
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    stored.lastFailure = copyAutopilotWatchFailure('bots.errors.quote', completedThrough, stored);
    sessionStorage.setItem(key, JSON.stringify(stored));
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.error.value).toBe('bots.autopilot.errors.trainingRejected');
    expect(reloaded.state.diagnostics.value).toMatchObject({
      stage: 'training',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
  });

  it('restores only this completed hour’s training reason codes after same-wallet reload resume', async () => {
    const first = await startWatching('training');
    const stored = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
    expect(stored.trainingDiagnostics).toMatchObject({
      stage: 'training',
      completedThrough,
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    reloaded.trading.connectionIdentity.value = 'wallet-two';
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('fund');
    expect(reloaded.state.diagnostics.value).toBeNull();
    reloaded.trading.connectionIdentity.value = 'wallet-one';
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.diagnostics.value).toEqual({
      stage: 'training',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.state.error.value).toBe('bots.autopilot.errors.trainingRejected');
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('restores a quote-screening-only rejection without retaining fee-pressure figures', async () => {
    const first = setup(false, true);
    Object.assign(first.input, { assetInAddress: GOAL_EXACT_KUSD, assetOutAddress: GOAL_EXACT_XOR, capital: '10' });
    first.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    await first.connect();
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough);
      throw createAutopilotQualificationError('training', [], null, {
        submitted: 1,
        dropped: [{ candidate: 1, reasons: ['quoteUnavailable'] }],
      });
    });
    await first.state.research(first.input);
    const stored = sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!;
    expect(stored).toContain('quoteUnavailable');
    expect(stored).not.toMatch(/feePressure|sharePercent|markAt|observedAt/);
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.error.value).toBe('bots.autopilot.errors.screeningRejected');
    expect(reloaded.state.diagnostics.value).toEqual({
      stage: 'training',
      failures: [],
      screening: { submitted: 1, dropped: [{ candidate: 1, reasons: ['quoteUnavailable'] }] },
    });
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps the last training reason on its original hour until a newer rejection replaces it', async () => {
    const first = await startWatching('training');
    first.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    let finish!: () => void;
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough + HOUR);
      await new Promise<void>((resolve) => (finish = resolve));
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['drawdown'] }]);
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!)).toMatchObject({
      lastAttemptedCompletedThrough: completedThrough + HOUR,
    });
    expect(
      JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!).trainingDiagnostics
    ).toMatchObject({
      stage: 'training',
      completedThrough,
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    finish();
    await flushPromises();
    expect(
      JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!).trainingDiagnostics
    ).toMatchObject({
      stage: 'training',
      completedThrough: completedThrough + HOUR,
      failures: [{ candidate: 1, reasons: ['drawdown'] }],
    });
    expect(first.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps the older training date across a newer expired request and explicit reload resume', async () => {
    const first = await startWatching('training');
    first.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough + HOUR);
      throw new Error('bots.codex.expired');
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    const stored = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
    expect(stored.lastAttemptedCompletedThrough).toBe(completedThrough + HOUR);
    expect(stored.trainingDiagnostics.completedThrough).toBe(completedThrough);
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.diagnostics.value?.failures).toEqual([{ candidate: 1, reasons: ['netLoss'] }]);
    expect(reloaded.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('restores only an unsigned exact watch and checks the latest indexed missed hour once', async () => {
    const f = await startWatching();
    const stored = JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!);
    expect(stored).toMatchObject({
      assistantKind: 'openai',
      input: {
        assetInAddress: GOAL_EXACT_KUSD,
        assetOutAddress: GOAL_EXACT_XOR,
        capital: '10',
        feeBudgetXor: '1',
        maxLossPercent: '5',
      },
      lastAttemptedCompletedThrough: completedThrough,
    });
    expect(JSON.stringify(stored)).not.toMatch(/test-secret|password|bearer|connectionId|requestId/);
    wrappers.pop()!.unmount();

    vi.setSystemTime(completedThrough + 3 * HOUR + 5 * 60_000);
    const reloaded = setup(false, true, false, f.exposureStore);
    reloaded.trading.assets.value = [...f.trading.assets.value];
    expect(reloaded.state.stage.value).toBe('welcome');
    expect(reloaded.state.canResumeWatch.value).toBe(true);
    expect(reloaded.state.recoverableWatchInput.value).toMatchObject(stored.input);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('connect');
    await reloaded.connect();
    expect(reloaded.state.stage.value).toBe('fund');
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.watchNextCheckAt.value).toBe(Date.now());
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();

    reloaded.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + 3 * HOUR,
      validationFrom: validationFrom + 3 * HOUR,
    });
    reloaded.researcher.run.mockImplementationOnce(async () => {
      reloaded.reportHistory(completedThrough + 3 * HOUR);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledOnce();
    expect(reloaded.researcher.run).toHaveBeenCalledOnce();
    expect(reloaded.researcher.run.mock.calls[0][0]).toMatchObject(stored.input);
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 4 * HOUR);
    expect(
      JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!).lastAttemptedCompletedThrough
    ).toBe(completedThrough + 3 * HOUR);
    expect(reloaded.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('checks the 15:00 indexed boundary immediately after a 15:12 resume and never replays its claim', async () => {
    const first = await startWatching();
    wrappers.pop()!.unmount();
    vi.setSystemTime(completedThrough + HOUR + 12 * 60_000);
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    reloaded.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    reloaded.researcher.run.mockImplementationOnce(async () => {
      reloaded.reportHistory(completedThrough + HOUR);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.watchNextCheckAt.value).toBe(Date.now());
    expect(reloaded.readResearchReadiness).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledOnce();
    expect(reloaded.researcher.run).toHaveBeenCalledOnce();
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    expect(
      JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!).lastAttemptedCompletedThrough
    ).toBe(completedThrough + HOUR);
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();

    wrappers.pop()!.unmount();
    const again = setup(false, true, false, first.exposureStore);
    again.trading.assets.value = [...first.trading.assets.value];
    await again.connect();
    await again.state.resumeWatch();
    expect(again.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    expect(again.readResearchReadiness).not.toHaveBeenCalled();
    expect(again.researcher.run).not.toHaveBeenCalled();
  });

  it('catches up the completed indexed hour after reload without manufacturing a missing result', async () => {
    const first = await startWatching();
    wrappers.pop()!.unmount();
    vi.setSystemTime(completedThrough + HOUR + 12 * 60_000);
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();

    const resumedAt = Date.now();
    expect(reloaded.state.watchNextCheckAt.value).toBe(resumedAt);
    await vi.advanceTimersByTimeAsync(1);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledOnce();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.watchNextCheckAt.value).toBe(resumedAt + 60_000);
    expect(
      JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!).lastAttemptedCompletedThrough
    ).toBe(completedThrough);

    reloaded.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    reloaded.researcher.run.mockImplementationOnce(async () => {
      reloaded.reportHistory(completedThrough + HOUR);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await vi.advanceTimersByTimeAsync(59_998);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledTimes(2);
    expect(reloaded.researcher.run).toHaveBeenCalledOnce();
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();

    wrappers.pop()!.unmount();
    const again = setup(false, true, false, first.exposureStore);
    again.trading.assets.value = [...first.trading.assets.value];
    await again.connect();
    await again.state.resumeWatch();
    expect(again.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(again.readResearchReadiness).not.toHaveBeenCalled();
    expect(again.researcher.run).not.toHaveBeenCalled();
    expect(again.trading.startBot).not.toHaveBeenCalled();
  });

  it('does not catch up a desktop watch until its new page companion is explicitly paired and resumed', async () => {
    const first = await startWatching('training', true);
    wrappers.pop()!.unmount();
    vi.setSystemTime(completedThrough + HOUR + 12 * 60_000);
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];

    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('connect');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reloaded.readResearchReadiness).not.toHaveBeenCalled();
    expect(reloaded.state.watchNextCheckAt.value).toBeNull();

    await reloaded.state.pairCompanion('test-only-code');
    expect(reloaded.companion.pair).toHaveBeenCalledOnce();
    expect(reloaded.state.companionConnected.value).toBe(true);
    expect(reloaded.state.desktopConnected.value).toBe(true);
    expect(reloaded.readResearchReadiness).not.toHaveBeenCalled();

    await reloaded.state.resumeWatch();
    expect(reloaded.state.watchNextCheckAt.value).toBe(Date.now());
    await vi.advanceTimersByTimeAsync(1);
    expect(reloaded.readResearchReadiness).toHaveBeenCalledOnce();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('retains a paused watch through transient wallet and node identities during reload', async () => {
    const first = await startWatching();
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    let network = '[true,"genesis","connecting",0]';
    reloaded.trading.readNetworkIdentity.mockImplementation(() => network);
    reloaded.trading.walletConnected.value = false;
    reloaded.trading.connectionIdentity.value = 'wallet-connecting';
    await flushPromises();

    reloaded.trading.walletConnected.value = true;
    reloaded.trading.connectionIdentity.value = 'wallet-temporary';
    await flushPromises();
    expect(reloaded.state.canResumeWatch.value).toBe(true);
    expect(reloaded.state.recoverableWatchInput.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).not.toBeNull();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();

    network = JSON.stringify([true, 'genesis', 'endpoint', 123]);
    reloaded.trading.connectionIdentity.value = 'wallet-one';
    await flushPromises();
    expect(reloaded.state.recoverableWatchInput.value).toMatchObject({
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
      feeBudgetXor: '1',
    });

    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('connect');
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('recovers the same wallet and chain across endpoint and runtime changes, then guards the live identity', async () => {
    const genesis = `0x${'ab'.repeat(32)}`;
    const otherGenesis = `0x${'cd'.repeat(32)}`;
    /** Mirror the controller's public node identity shape. */
    const node = (chain: string, endpoint: string, spec: number) => JSON.stringify([true, chain, endpoint, spec]);
    /** Mirror the controller's public wallet and node identity shape. */
    const identity = (address: string, source: string, chain: string, endpoint: string, spec: number) =>
      JSON.stringify([true, address, source, true, chain, endpoint, spec]);
    const savedNetwork = node(genesis, 'wss://old-node', 130);
    const savedIdentity = identity('cn-public-address', 'polkadot-js', genesis, 'wss://old-node', 130);
    const currentNetwork = node(genesis, 'wss://new-node', 131);
    const currentIdentity = identity('cn-public-address', 'polkadot-js', genesis, 'wss://new-node', 131);
    const first = setup(false, true);
    Object.assign(first.input, {
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
    });
    first.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    first.trading.connectionIdentity.value = savedIdentity;
    first.trading.readNetworkIdentity.mockReturnValue(savedNetwork);
    await first.connect();
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await first.state.research(first.input);
    expect(first.state.stage.value).toBe('watching');
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    for (const [candidate, candidateNetwork] of [
      [identity('cn-other-address', 'polkadot-js', genesis, 'wss://new-node', 131), currentNetwork],
      [identity('cn-public-address', 'other-wallet', genesis, 'wss://new-node', 131), currentNetwork],
      [
        identity('cn-public-address', 'polkadot-js', otherGenesis, 'wss://new-node', 131),
        node(otherGenesis, 'wss://new-node', 131),
      ],
      [identity('cn-public-address', 'polkadot-js', genesis, 'wss://new-node', 0), node(genesis, 'wss://new-node', 0)],
    ] as const) {
      reloaded.trading.readNetworkIdentity.mockReturnValue(candidateNetwork);
      reloaded.trading.connectionIdentity.value = candidate;
      await flushPromises();
      expect(reloaded.state.recoverableWatchInput.value).toBeNull();
      expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).not.toBeNull();
    }

    reloaded.trading.readNetworkIdentity.mockReturnValue(currentNetwork);
    reloaded.trading.connectionIdentity.value = currentIdentity;
    await flushPromises();
    expect(reloaded.state.recoverableWatchInput.value).toMatchObject({
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
    });
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('connect');
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!)).toMatchObject({
      identity: currentIdentity,
      network: currentNetwork,
      trainingDiagnostics: {
        stage: 'training',
        completedThrough,
        failures: [{ candidate: 1, reasons: ['netLoss'] }],
      },
    });
    wrappers.pop()!.unmount();
    const again = setup(false, true, false, first.exposureStore);
    again.trading.assets.value = [...first.trading.assets.value];
    again.trading.readNetworkIdentity.mockReturnValue(currentNetwork);
    again.trading.connectionIdentity.value = currentIdentity;
    await again.connect();
    await again.state.resumeWatch();
    expect(again.state.stage.value).toBe('watching');
    expect(again.state.diagnostics.value).toEqual({
      stage: 'training',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    expect(again.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(again.researcher.run).not.toHaveBeenCalled();

    again.trading.readNetworkIdentity.mockReturnValue(node(genesis, 'wss://third-node', 131));
    again.trading.connectionIdentity.value = identity(
      'cn-public-address',
      'polkadot-js',
      genesis,
      'wss://third-node',
      131
    );
    await flushPromises();
    expect(again.state.watchNextCheckAt.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).not.toBeNull();
    expect(again.state.recoverableWatchInput.value).toMatchObject({ capital: '10' });
    expect(again.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(again.trading.startBot).not.toHaveBeenCalled();
  });

  it('does not arm a resumed watch when the full node identity changes during exposure refresh', async () => {
    const first = await startWatching();
    wrappers.pop()!.unmount();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    const genesis = `0x${'ab'.repeat(32)}`;
    const savedNetwork = JSON.stringify([true, genesis, 'wss://old-node', 130]);
    const currentNetwork = JSON.stringify([true, genesis, 'wss://new-node', 131]);
    const changedNetwork = JSON.stringify([true, genesis, 'wss://third-node', 132]);
    saved.identity = JSON.stringify([true, 'cn-public-address', 'polkadot-js', true, genesis, 'wss://old-node', 130]);
    saved.network = savedNetwork;
    saved.trainingDiagnostics = copyAutopilotTrainingWatchDiagnostics(
      saved.trainingDiagnostics,
      saved.trainingDiagnostics.completedThrough,
      saved
    );
    sessionStorage.setItem(key, JSON.stringify(saved));

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    reloaded.trading.readNetworkIdentity.mockReturnValue(currentNetwork);
    reloaded.trading.connectionIdentity.value = JSON.stringify([
      true,
      'cn-public-address',
      'polkadot-js',
      true,
      genesis,
      'wss://new-node',
      131,
    ]);
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('connect');
    await reloaded.connect();

    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const read = vi.spyOn(first.exposureStore, 'read').mockImplementation(async () => {
      await gate;
      return null;
    });
    const resuming = reloaded.state.resumeWatch();
    await flushPromises();
    expect(read).toHaveBeenCalled();
    reloaded.trading.readNetworkIdentity.mockReturnValue(changedNetwork);
    reloaded.trading.connectionIdentity.value = JSON.stringify([
      true,
      'cn-public-address',
      'polkadot-js',
      true,
      genesis,
      'wss://third-node',
      132,
    ]);
    release();
    await resuming;
    expect(reloaded.state.stage.value).not.toBe('watching');
    expect(reloaded.state.watchNextCheckAt.value).toBeNull();
    expect(sessionStorage.getItem(key)).not.toBeNull();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps a reloaded watch resumable when an earlier live goal remains saved', async () => {
    const first = await startWatching();
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [...first.trading.assets.value];
    reloaded.trading.bots.value = [goalStorageBot('earlier-goal')];
    await flushPromises();

    expect(reloaded.state.stage.value).toBe('welcome');
    expect(reloaded.state.canResumeWatch.value).toBe(true);
    expect(reloaded.state.selectedBot.value).toBeNull();

    await reloaded.state.resumeWatch();
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.trading.stopBot).not.toHaveBeenCalled();
  });

  it('rechecks durable holdout exposure before rearming a reloaded watch', async () => {
    const f = await startWatching('validation');
    wrappers.pop()!.unmount();
    vi.setSystemTime(completedThrough + HOUR + 5 * 60_000);
    const reloaded = setup(false, true, false, f.exposureStore);
    reloaded.trading.assets.value = [...f.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 50 * HOUR);
    expect(reloaded.readResearchReadiness).not.toHaveBeenCalled();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
  });

  it('keeps a reloaded watch for its original wallet without arming it under another wallet', async () => {
    const f = await startWatching();
    wrappers.pop()!.unmount();
    const reloaded = setup(false, true, false, f.exposureStore);
    reloaded.trading.assets.value = [...f.trading.assets.value];
    reloaded.trading.connectionIdentity.value = 'wallet-two';
    await reloaded.state.resumeWatch();
    expect(reloaded.state.canResumeWatch.value).toBe(true);
    expect(reloaded.state.recoverableWatchInput.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).not.toBeNull();
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    reloaded.trading.connectionIdentity.value = 'wallet-one';
    await flushPromises();
    expect(reloaded.state.recoverableWatchInput.value).toMatchObject({ capital: '10' });
    await reloaded.state.resumeWatch();
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.stage.value).toBe('watching');
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
  });

  it('retains exact saved-plan presentation and dated diagnostics while only the original hydrated wallet can resume', async () => {
    const genesis = `0x${'ab'.repeat(32)}`;
    const network = JSON.stringify([true, genesis, 'wss://node', 130]);
    const identity = (address: string) =>
      JSON.stringify([true, address, 'polkadot-js', true, genesis, 'wss://node', 130]);
    const first = setup(false, true);
    Object.assign(first.input, {
      assetInAddress: GOAL_EXACT_KUSD,
      assetOutAddress: GOAL_EXACT_XOR,
      capital: '10',
      feeBudgetXor: '1',
      maxLossPercent: '10',
      targetReturnPercent: '5',
    });
    first.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    first.trading.connectionIdentity.value = identity('tc1-public-address');
    first.trading.readNetworkIdentity.mockReturnValue(network);
    await first.connect();
    first.researcher.run.mockImplementationOnce(async () => {
      first.reportHistory(completedThrough);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await first.state.research(first.input);
    const stored = sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1');
    wrappers.pop()!.unmount();

    const reloaded = setup(false, true, false, first.exposureStore);
    reloaded.trading.assets.value = [];
    reloaded.trading.walletConnected.value = false;
    reloaded.trading.connectionIdentity.value = 'connecting';
    await flushPromises();
    expect(reloaded.state.watchRecovery.value).toMatchObject({
      input: { capital: '10', maxLossPercent: '10', feeBudgetXor: '1', targetReturnPercent: '5' },
      walletAddress: 'tc1-public-address',
      trainingDiagnostics: { stage: 'training', completedThrough, failures: [{ candidate: 1, reasons: ['netLoss'] }] },
    });
    expect(Object.isFrozen(reloaded.state.watchRecovery.value!.input)).toBe(true);
    expect(reloaded.state.recoverableWatchInput.value).toBeNull();
    reloaded.trading.readNetworkIdentity.mockReturnValue(network);
    reloaded.trading.walletConnected.value = true;
    reloaded.trading.connectionIdentity.value = identity('sora-store-public-address');
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await flushPromises();
    expect(reloaded.state.recoverableWatchInput.value).toBeNull();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.error.value).toBe('bots.errors.session');
    expect(reloaded.state.stage.value).toBe('welcome');
    expect(reloaded.state.watchNextCheckAt.value).toBeNull();
    expect(reloaded.ai).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);

    reloaded.trading.assets.value = [];
    reloaded.trading.connectionIdentity.value = identity('tc1-public-address');
    await flushPromises();
    expect(reloaded.state.recoverableWatchInput.value).toBeNull();
    expect(reloaded.state.watchRecovery.value!.input.maxLossPercent).toBe('10');
    await reloaded.state.resumeWatch();
    expect(reloaded.state.watchRecovery.value!.input.maxLossPercent).toBe('10');
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
    expect(reloaded.ai).not.toHaveBeenCalled();
    reloaded.trading.assets.value = [...first.trading.assets.value];
    await flushPromises();
    expect(reloaded.state.recoverableWatchInput.value).toEqual(first.input);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
    expect(reloaded.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(reloaded.trading.startBot).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBe(stored);
    reloaded.state.cancel();
    expect(reloaded.state.watchRecovery.value).toBeNull();
  });

  it('advances the durable hour before an automatic draft so reload cannot repeat the interrupted hour', async () => {
    const f = await startWatching();
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    let finish!: () => void;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR);
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')!).lastAttemptedCompletedThrough
    ).toBe(completedThrough + HOUR);
    wrappers.pop()!.unmount();
    finish();
    await flushPromises();
    vi.setSystemTime(completedThrough + HOUR + 5 * 60_000);
    const reloaded = setup(false, true, false, f.exposureStore);
    reloaded.trading.assets.value = [...f.trading.assets.value];
    await reloaded.connect();
    await reloaded.state.resumeWatch();
    expect(reloaded.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    expect(reloaded.researcher.run).not.toHaveBeenCalled();
  });

  it('retains the claimed hour when the wallet changes during an automatic draft', async () => {
    const f = await startWatching();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    let finish!: () => void;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR);
      await new Promise<void>((resolve) => (finish = resolve));
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.stage.value).toBe('research');
    expect(JSON.parse(sessionStorage.getItem(key)!).lastAttemptedCompletedThrough).toBe(completedThrough + HOUR);

    f.trading.connectionIdentity.value = 'wallet-two';
    await flushPromises();
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(sessionStorage.getItem(key)).not.toBeNull();
    finish();
    await flushPromises();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();

    f.trading.connectionIdentity.value = 'wallet-one';
    await flushPromises();
    await f.state.resumeWatch();
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
  });

  it('does not dispatch an automatic draft when the attempted-hour checkpoint cannot be saved', async () => {
    const f = await startWatching();
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    const setItem = sessionStorage.setItem.bind(sessionStorage);
    vi.spyOn(sessionStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'polkaswap-bots-opportunity-watch-v1') throw Error('quota');
      return setItem(key, value);
    });

    await vi.advanceTimersByTimeAsync(55 * 60_000);

    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.error.value).toBe('bots.errors.storage');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('forgets the reload checkpoint on explicit Stop', async () => {
    const f = await startWatching();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).not.toBeNull();
    f.state.cancel();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
    expect(f.state.canResumeWatch.value).toBe(false);
  });

  it('lets only one simultaneous tab dispatch a shared holdout', async () => {
    const shared = memoryExposureStore();
    const tabs = [setup(false, true, false, shared), setup(false, true, false, shared)];
    await Promise.all(tabs.map((tab) => tab.connect()));
    let dispatched = 0;
    for (const tab of tabs)
      tab.researcher.run.mockImplementationOnce(async () => {
        tab.reportHistory(completedThrough);
        await tab.reportValidation(validationFrom, completedThrough);
        dispatched++;
        throw createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['netLoss'] }]);
      });
    await Promise.all(tabs.map((tab) => tab.state.research(tab.input)));
    expect(dispatched).toBe(1);
    expect(tabs.every((tab) => tab.trading.prepareLiveBot.mock.calls.length === 0)).toBe(true);
  });

  it('never reads held-out data when the exposure write fails', async () => {
    const store: AutopilotValidationExposureStore = {
      read: vi.fn(async () => null),
      reserve: vi.fn(async () => {
        throw Error('bots.errors.storage');
      }),
      saveDiagnostics: vi.fn(),
    };
    const f = setup(false, true, false, store);
    await f.connect();
    let dispatched = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      await f.reportValidation(validationFrom, completedThrough);
      dispatched = true;
      throw Error('holdout must remain untouched');
    });
    await f.state.research(f.input);
    expect(dispatched).toBe(false);
    expect(f.state.error.value).toBe('bots.errors.storage');
    expect(f.state.stage.value).toBe('fund');
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it('does not request a new AI draft when the prior exposure cannot be read', async () => {
    const store: AutopilotValidationExposureStore = {
      read: vi.fn(async () => {
        throw Error('bots.errors.storage');
      }),
      reserve: vi.fn(),
      saveDiagnostics: vi.fn(),
    };
    const f = setup(false, true, false, store);
    await f.connect();
    await f.state.research(f.input);
    expect(f.researcher.run).not.toHaveBeenCalled();
    expect(f.state.error.value).toBe('bots.errors.storage');
    expect(f.state.stage.value).toBe('fund');
    expect(store.reserve).not.toHaveBeenCalled();
  });

  it('records validation exposure before a pending run is cancelled', async () => {
    const f = setup(false, true);
    await f.connect();
    f.researcher.run.mockImplementationOnce(async (_input, _client, signal) => {
      f.reportHistory(completedThrough);
      await f.reportValidation(validationFrom, completedThrough);
      return new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('cancelled'))));
    });
    const pending = f.state.research(f.input);
    await flushPromises();
    f.state.cancel();
    await pending;
    let dispatched = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      await f.reportValidation(validationFrom, completedThrough);
      dispatched = true;
      throw new Error('unreachable');
    });
    await f.state.research(f.input);
    expect(dispatched).toBe(false);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.error.value).toBe('');
    expect(f.state.diagnostics.value).toBeNull();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it('keeps the holdout quarantine when a manual GO reverses the pair', async () => {
    const f = await startWatching('validation');
    f.state.cancel();
    [f.input.assetInAddress, f.input.assetOutAddress] = [f.input.assetOutAddress, f.input.assetInAddress];
    let drafted = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      drafted = true;
      throw new Error('unreachable');
    });
    await f.state.go(f.input);
    expect(drafted).toBe(false);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 50 * HOUR);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('uses the newly prepared boundary before scheduling another failed search', async () => {
    const f = await startWatching();
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['drawdown'] }]);
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.state.diagnosticsCompletedThrough.value).toBe(completedThrough + HOUR);
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
    await vi.advanceTimersByTimeAsync(59 * 60_000);
    expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it.each(['bots.errors.stale', 'bots.codex.expired', 'bots.autopilot.errors.historyUnavailable'])(
    'keeps an automatic %s failure watching until another new hour',
    async (errorKey) => {
      const f = await startWatching();
      f.readResearchReadiness.mockResolvedValue({
        completedThrough: completedThrough + HOUR,
        validationFrom: validationFrom + HOUR,
      });
      f.researcher.run.mockImplementationOnce(async () => {
        if (errorKey === 'bots.codex.expired') f.reportHistory(completedThrough + HOUR);
        throw new Error(errorKey);
      });
      await vi.advanceTimersByTimeAsync(55 * 60_000);
      expect(f.state.stage.value).toBe('watching');
      expect(f.state.error.value).toBe(errorKey);
      expect(f.state.diagnostics.value).toBeNull();
      expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 2 * HOUR);
      await vi.advanceTimersByTimeAsync(59 * 60_000);
      expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
      expect(f.researcher.run).toHaveBeenCalledTimes(2);
      expect(f.client.disconnect).not.toHaveBeenCalled();
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it.each(['bots.errors.stale', 'bots.codex.expired', 'bots.autopilot.errors.historyUnavailable'])(
    'retains the original training check separately from an automatic %s failure',
    async (errorKey) => {
      const f = await startWatching();
      const previous = f.state.watchRecovery.value!.trainingDiagnostics;
      f.readResearchReadiness.mockResolvedValue({
        completedThrough: completedThrough + HOUR,
        validationFrom: validationFrom + HOUR,
      });
      f.researcher.run.mockImplementationOnce(async () => {
        if (errorKey === 'bots.codex.expired') f.reportHistory(completedThrough + HOUR);
        throw new Error(errorKey);
      });
      await vi.advanceTimersByTimeAsync(55 * 60_000);

      expect(f.state.stage.value).toBe('watching');
      expect(f.state.error.value).toBe(errorKey);
      expect(f.state.diagnostics.value).toBeNull();
      expect(f.state.diagnosticsCompletedThrough.value).toBeNull();
      expect(f.state.watchRecovery.value?.trainingDiagnostics).toEqual(previous);
      expect(f.state.watchRecovery.value?.trainingDiagnostics).toMatchObject({
        completedThrough,
        failures: [{ candidate: 1, reasons: ['netLoss'] }],
      });
      expect(f.state.recoverableWatchInput.value).toMatchObject({
        capital: '10',
        feeBudgetXor: '1',
        assetInAddress: GOAL_EXACT_KUSD,
        assetOutAddress: GOAL_EXACT_XOR,
      });
      expect(f.state.canResumeWatch.value).toBe(false);
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
      f.state.cancel();
      expect(f.state.watchRecovery.value).toBeNull();
    }
  );

  it('does not publish active-watch historical diagnostics after the live identity stops matching', async () => {
    const f = await startWatching();
    expect(f.state.watchRecovery.value?.trainingDiagnostics?.completedThrough).toBe(completedThrough);
    f.trading.readConnectionIdentity.mockReturnValue('different-wallet');
    // Trigger an active presentation read before the asynchronous identity watcher can pause recovery.
    f.trading.connectionIdentity.value = 'different-wallet';
    expect(f.state.watchRecovery.value).toBeNull();
    expect(f.state.recoverableWatchInput.value).toBeNull();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
    await flushPromises();
    expect(f.state.stage.value).toBe('fund');
    // The paused original public plan can remain visible, but the replacement wallet cannot resume it.
    expect(f.state.watchRecovery.value?.trainingDiagnostics?.completedThrough).toBe(completedThrough);
    expect(f.state.recoverableWatchInput.value).toBeNull();
  });

  it('retains the full holdout quarantine when automatic research becomes stale after validation starts', async () => {
    const f = await startWatching();
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough + HOUR);
      await f.reportValidation(validationFrom + HOUR, completedThrough + HOUR);
      throw new Error('bots.errors.stale');
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.error.value).toBe('bots.errors.stale');
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 51 * HOUR);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it.each([
    'bots.errors.provider',
    'bots.errors.config',
    'bots.errors.balance',
    'bots.autopilot.errors.insufficientFeeBudget',
  ])('stops an automatic %s failure instead of retaining a retry loop', async (errorKey) => {
    const f = await startWatching();
    f.readResearchReadiness.mockResolvedValue({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    f.researcher.run.mockRejectedValueOnce(new Error(errorKey));
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.error.value).toBe(errorKey);
    expect(f.state.watchNextCheckAt.value).toBeNull();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it('revokes a metadata read when the network changes without a wallet-ref notification', async () => {
    const f = await startWatching();
    let resolve!: (ready: null) => void;
    f.readResearchReadiness.mockImplementation(() => new Promise((done) => (resolve = done)));
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    const signal = f.readResearchReadiness.mock.calls[0][1];
    f.trading.readNetworkIdentity.mockReturnValue('another-network');
    resolve(null);
    await flushPromises();
    expect(signal.aborted).toBe(true);
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    await vi.advanceTimersByTimeAsync(HOUR);
    expect(f.readResearchReadiness).toHaveBeenCalledTimes(1);
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it('stops watching without an unhandled timer error when the identity reader fails', async () => {
    const f = await startWatching();
    f.trading.readNetworkIdentity.mockImplementation(() => {
      throw new Error('unavailable identity');
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledTimes(1);
  });

  it('rejects detached callbacks without contaminating the next manual validation window', async () => {
    const f = await startWatching();
    f.state.cancel();
    expect(() => f.reportHistory(completedThrough)).toThrow('bots.errors.stale');
    await expect(f.reportValidation(validationFrom, completedThrough)).rejects.toThrow('bots.errors.stale');
    let dispatched = false;
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      await f.reportValidation(validationFrom, completedThrough);
      dispatched = true;
      throw createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['drawdown'] }]);
    });
    await f.state.research(f.input);
    expect(dispatched).toBe(true);
    expect(f.state.stage.value).toBe('watching');
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 50 * HOUR);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
  });

  it.each(['future-history', 'future-validation', 'mismatched-validation'] as const)(
    'rejects %s callback metadata without recording exposure',
    async (kind) => {
      const f = setup(false, true);
      await f.connect();
      f.researcher.run.mockImplementationOnce(async () => {
        f.reportHistory(kind === 'future-history' ? completedThrough + HOUR : completedThrough);
        await f.reportValidation(
          kind === 'mismatched-validation' ? validationFrom + HOUR : validationFrom,
          kind === 'future-validation' ? completedThrough + HOUR : completedThrough
        );
        throw new Error('unreachable');
      });
      await f.state.research(f.input);
      expect(f.state.error.value).toBe('bots.errors.stale');
      expect(f.state.stage.value).toBe('fund');
      expect(f.state.watchNextCheckAt.value).toBeNull();
      let dispatched = false;
      f.researcher.run.mockImplementationOnce(async () => {
        f.reportHistory(completedThrough);
        await f.reportValidation(validationFrom, completedThrough);
        dispatched = true;
        throw createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['netLoss'] }]);
      });
      await f.state.research(f.input);
      expect(dispatched).toBe(true);
      expect(f.state.stage.value).toBe('watching');
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    }
  );

  it.each(['provider', 'invalid-input', 'forged-diagnostics', 'missing-window'] as const)(
    'does not automatically retry %s failure',
    async (kind) => {
      const f = setup(false, true);
      await f.connect();
      f.researcher.run.mockImplementationOnce(async () => {
        if (kind !== 'missing-window') f.reportHistory(completedThrough);
        if (kind === 'missing-window')
          throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
        if (kind === 'forged-diagnostics')
          throw Object.assign(new Error('provider private response'), {
            diagnostics: { stage: 'training', failures: [] },
          });
        throw new Error(kind === 'provider' ? 'bots.errors.provider' : 'bots.errors.amount');
      });
      await f.state.research(f.input);
      expect(f.state.stage.value).toBe('fund');
      expect(f.state.watchNextCheckAt.value).toBeNull();
      await vi.advanceTimersByTimeAsync(2 * HOUR);
      expect(f.readResearchReadiness).not.toHaveBeenCalled();
      expect(f.researcher.run).toHaveBeenCalledTimes(1);
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    }
  );

  it('pauses navigation with the exact unsigned watch while revoking desktop and companion authority', async () => {
    const f = await startStructuredDesktopWatch();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = sessionStorage.getItem(key);
    const connectionId = f.state.desktopConnectionId.value;
    const checkpoint = JSON.parse(stored!);

    f.state.pauseForNavigation();

    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.state.watchRecovery.value).toMatchObject({
      input: checkpoint.input,
      walletAddress: 'tc1-public-address',
      trainingDiagnostics: checkpoint.trainingDiagnostics,
    });
    expect(f.state.canResumeWatch.value).toBe(true);
    expect(f.state.stage.value).toBe('welcome');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.state.desktopConnected.value).toBe(false);
    expect(f.state.desktopConnectionId.value).toBe('');
    expect(f.state.desktopContext.value).toBe('');
    expect(f.state.desktopPending.value).toBe(false);
    expect(f.state.companionConnected.value).toBe(false);
    expect(f.companion.disconnect).toHaveBeenCalledOnce();
    expect(f.desktopClient.disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.desktopAi).toHaveBeenCalledOnce();
    expect(f.companion.pair).toHaveBeenCalledOnce();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();

    await f.state.resumeWatch();
    expect(f.state.stage.value).toBe('connect');
    expect(f.state.desktopConnectionId.value).not.toBe(connectionId);
    expect(f.state.desktopConnected.value).toBe(false);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    await f.state.pairCompanion('test-only-new-code');
    expect(f.state.stage.value).not.toBe('watching');
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    await f.state.resumeWatch();
    expect(f.state.stage.value).toBe('watching');
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('aborts a navigation-paused readiness read and ignores a metadata reader that resolves after abort', async () => {
    const f = await startWatching();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    let finish!: (ready: { completedThrough: number; validationFrom: number }) => void;
    f.readResearchReadiness.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    const signal = f.readResearchReadiness.mock.calls[0][1];
    const stored = sessionStorage.getItem(key);

    f.state.pauseForNavigation();
    expect(signal.aborted).toBe(true);
    finish({ completedThrough: completedThrough + HOUR, validationFrom: validationFrom + HOUR });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2 * HOUR);

    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.state.canResumeWatch.value).toBe(true);
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.readResearchReadiness).toHaveBeenCalledOnce();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('retains the attempted hour and rejects a late automatic research success after navigation', async () => {
    const f = await startWatching();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    f.readResearchReadiness.mockResolvedValueOnce({
      completedThrough: completedThrough + HOUR,
      validationFrom: validationFrom + HOUR,
    });
    let finish!: (result: AutopilotResult) => void;
    let signal!: AbortSignal;
    f.researcher.run.mockImplementationOnce(async (_input, _client, pendingSignal) => {
      signal = pendingSignal!;
      f.reportHistory(completedThrough + HOUR, validationFrom + HOUR);
      return new Promise((resolve) => (finish = resolve));
    });
    await vi.advanceTimersByTimeAsync(55 * 60_000);
    expect(f.state.stage.value).toBe('research');
    const stored = sessionStorage.getItem(key);
    expect(JSON.parse(stored!).lastAttemptedCompletedThrough).toBe(completedThrough + HOUR);

    f.state.pauseForNavigation();
    expect(signal.aborted).toBe(true);
    finish({ bot: botFixture(), settings: {}, research: {}, denomination: {}, candidates: 3 } as AutopilotResult);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2 * HOUR);

    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.state.stage.value).toBe('fund');
    expect(f.state.canResumeWatch.value).toBe(true);
    expect(f.state.reviewBot.value).toBeNull();
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.researcher.run).toHaveBeenCalledTimes(2);
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('does not manufacture unsigned recovery for an unfinished first research attempt', async () => {
    const f = setup(false, true);
    await f.connect();
    let finish!: (result: AutopilotResult) => void;
    let signal!: AbortSignal;
    f.researcher.run.mockImplementationOnce(async (_input, _client, pendingSignal) => {
      signal = pendingSignal!;
      f.reportHistory(completedThrough);
      return new Promise((resolve) => (finish = resolve));
    });
    const pending = f.state.research(f.input);
    await flushPromises();
    expect(f.state.stage.value).toBe('research');
    f.state.pauseForNavigation();
    expect(signal.aborted).toBe(true);
    finish({ bot: botFixture(), settings: {}, research: {}, denomination: {}, candidates: 3 } as AutopilotResult);
    await pending;

    expect(f.state.canResumeWatch.value).toBe(false);
    expect(f.state.watchRecovery.value).toBeNull();
    expect(sessionStorage.getItem('polkaswap-bots-opportunity-watch-v1')).toBeNull();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps the rejected holdout and its original wait boundary across navigation and explicit Resume', async () => {
    const f = await startWatching('validation');
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = sessionStorage.getItem(key);
    const reservations = vi.mocked(f.exposureStore.reserve).mock.calls.length;
    f.state.pauseForNavigation();
    expect(sessionStorage.getItem(key)).toBe(stored);
    await f.state.resumeWatch();

    expect(f.state.stage.value).toBe('watching');
    expect(f.state.diagnostics.value).toEqual({
      stage: 'validation',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
    });
    expect(f.state.diagnosticsCompletedThrough.value).toBe(completedThrough);
    expect(f.state.watchNextCheckAt.value).toBe(completedThrough + 50 * HOUR);
    expect(f.exposureStore.reserve).toHaveBeenCalledTimes(reservations);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('revokes implicit same-node rearming when navigation pauses a disconnected watch', async () => {
    const f = await startStructuredDesktopWatch();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = sessionStorage.getItem(key);
    f.trading.readNetworkIdentity.mockReturnValue(f.disconnectedNetwork);
    f.trading.connectionIdentity.value = f.disconnected;
    await flushPromises();
    f.state.pauseForNavigation();
    f.trading.readNetworkIdentity.mockReturnValue(f.connectedNetwork);
    f.trading.connectionIdentity.value = f.connected;
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2 * HOUR);

    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.state.canResumeWatch.value).toBe(true);
    expect(f.state.stage.value).toBe('welcome');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.state.desktopConnected.value).toBe(false);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledOnce();
  });

  it.each(['wallet', 'chain'] as const)('keeps navigation recovery bound to its original %s', async (change) => {
    const f = await startStructuredDesktopWatch();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = sessionStorage.getItem(key);
    f.state.pauseForNavigation();
    const otherGenesis = `0x${'cd'.repeat(32)}`;
    f.trading.connectionIdentity.value = JSON.stringify([
      true,
      change === 'wallet' ? 'other-public-address' : 'tc1-public-address',
      'polkadot-js',
      true,
      change === 'chain' ? otherGenesis : f.genesis,
      f.endpoint,
      130,
    ]);
    if (change === 'chain')
      f.trading.readNetworkIdentity.mockReturnValue(JSON.stringify([true, otherGenesis, f.endpoint, 130]));
    await flushPromises();
    await f.state.resumeWatch();

    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.state.watchRecovery.value!.input).toEqual(f.input);
    expect(f.state.recoverableWatchInput.value).toBeNull();
    expect(f.state.error.value).toBe('bots.errors.session');
    expect(f.state.stage.value).toBe('welcome');
    expect(f.desktopAi).toHaveBeenCalledOnce();
    expect(f.companion.pair).toHaveBeenCalledOnce();
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it.each(['expired', 'malformed', 'replaced', 'oversized', 'unavailable'] as const)(
    'does not retain or adopt a %s stored record on navigation',
    async (condition) => {
      const f = await startWatching();
      const key = 'polkaswap-bots-opportunity-watch-v1';
      const checkpoint = JSON.parse(sessionStorage.getItem(key)!);
      if (condition === 'expired') vi.setSystemTime(checkpoint.savedAt + 7 * 24 * HOUR + 1);
      if (condition === 'malformed') sessionStorage.setItem(key, JSON.stringify({ ...checkpoint, version: 2 }));
      if (condition === 'replaced') {
        // Still structurally valid; navigation cannot replace the accepted watch with another goal.
        delete checkpoint.trainingDiagnostics;
        checkpoint.input.capital = '11';
        sessionStorage.setItem(key, JSON.stringify(checkpoint));
      }
      if (condition === 'oversized') sessionStorage.setItem(key, 'x'.repeat(4097));
      const unavailable =
        condition === 'unavailable'
          ? vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
              throw Error('storage unavailable');
            })
          : null;
      f.state.pauseForNavigation();
      unavailable?.mockRestore();

      expect(sessionStorage.getItem(key)).toBeNull();
      expect(f.state.canResumeWatch.value).toBe(false);
      expect(f.state.watchRecovery.value).toBeNull();
      expect(f.state.watchNextCheckAt.value).toBeNull();
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it.each(['expired', 'malformed', 'replaced'] as const)(
    'rechecks a navigation-paused record before explicit Resume when it becomes %s',
    async (condition) => {
      const f = await startWatching();
      const key = 'polkaswap-bots-opportunity-watch-v1';
      f.state.pauseForNavigation();
      const checkpoint = JSON.parse(sessionStorage.getItem(key)!);
      if (condition === 'expired') vi.setSystemTime(checkpoint.savedAt + 7 * 24 * HOUR + 1);
      if (condition === 'malformed') sessionStorage.setItem(key, JSON.stringify({ ...checkpoint, version: 2 }));
      if (condition === 'replaced') {
        delete checkpoint.trainingDiagnostics;
        checkpoint.input.maxLossPercent = '20';
        sessionStorage.setItem(key, JSON.stringify(checkpoint));
      }
      await f.state.resumeWatch();

      expect(sessionStorage.getItem(key)).toBeNull();
      expect(f.state.canResumeWatch.value).toBe(false);
      expect(f.state.error.value).toBe('bots.errors.session');
      expect(f.state.watchNextCheckAt.value).toBeNull();
      expect(f.readResearchReadiness).not.toHaveBeenCalled();
      expect(f.researcher.run).toHaveBeenCalledOnce();
      expect(f.trading.prepareLiveBot).not.toHaveBeenCalled();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it('rejects expiry reached during the awaited exposure refresh without rearming the paused watch', async () => {
    const f = await startWatching();
    const key = 'polkaswap-bots-opportunity-watch-v1';
    f.state.pauseForNavigation();
    const checkpoint = JSON.parse(sessionStorage.getItem(key)!);
    let finish!: (window: AutopilotValidationWindow | null) => void;
    vi.mocked(f.exposureStore.read).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = f.state.resumeWatch();
    await flushPromises();
    expect(f.state.busy.value).toBe(true);
    vi.setSystemTime(checkpoint.savedAt + 7 * 24 * HOUR + 1);
    finish(null);
    await pending;

    expect(sessionStorage.getItem(key)).toBeNull();
    expect(f.state.canResumeWatch.value).toBe(false);
    expect(f.state.error.value).toBe('bots.errors.session');
    expect(f.state.watchNextCheckAt.value).toBeNull();
    expect(f.state.busy.value).toBe(false);
    expect(f.readResearchReadiness).not.toHaveBeenCalled();
    expect(f.researcher.run).toHaveBeenCalledOnce();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'begin', 'disconnectDesktop'] as const)(
    'keeps explicit %s clearing semantics after navigation recovery',
    async (action) => {
      const f = await startWatching('training', true);
      const key = 'polkaswap-bots-opportunity-watch-v1';
      f.state.pauseForNavigation();
      expect(sessionStorage.getItem(key)).not.toBeNull();
      if (action === 'disconnectDesktop') await f.state.connectDesktop();
      await f.state[action]();

      expect(sessionStorage.getItem(key)).toBeNull();
      expect(f.state.canResumeWatch.value).toBe(false);
      expect(f.state.watchRecovery.value).toBeNull();
      expect(f.state.watchNextCheckAt.value).toBeNull();
      expect(f.researcher.run).toHaveBeenCalledOnce();
      expect(f.trading.startBot).not.toHaveBeenCalled();
    }
  );

  it('cancels navigation pairing immediately and ignores its late bind without acknowledging the old mailbox', async () => {
    const f = await startWatching('training', true);
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = sessionStorage.getItem(key);
    let finish!: () => void;
    vi.mocked(f.companion.pair).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = f.state.pairCompanion('test-only-pending-code');
    const signal = vi.mocked(f.companion.pair).mock.calls[0][1]!;
    expect(f.state.companionPairing.value).toBe(true);

    f.state.pauseForNavigation();
    expect(signal.aborted).toBe(true);
    expect(f.state.companionPairing.value).toBe(false);
    finish();
    await pending;
    await vi.advanceTimersByTimeAsync(30_000);

    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.state.canResumeWatch.value).toBe(true);
    expect(f.state.desktopConnectionId.value).toBe('');
    expect(f.state.desktopConnected.value).toBe(false);
    expect(f.state.companionConnected.value).toBe(false);
    expect(f.state.companionError.value).toBe('');
    expect(f.companion.disconnect).toHaveBeenCalledOnce();
    expect(f.desktopClient.connect).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('keeps navigation recovery visible when an older live goal is selected and later refreshed', async () => {
    const f = setup(true, true);
    f.trading.assets.value = [
      { address: GOAL_EXACT_KUSD, symbol: 'KUSD', decimals: 18 },
      { address: GOAL_EXACT_XOR, symbol: 'XOR', decimals: 18 },
    ];
    await f.state.connectDesktop();
    f.reportAgentConnected();
    const older = { ...goalStorageBot('selected-older-goal'), status: 'running' as const };
    f.trading.bots.value = [older];
    f.trading.sessionActiveIds.value = [older.id];
    await f.state.resume(older.id);
    expect(f.state.selectedBot.value!.id).toBe(older.id);
    f.researcher.run.mockImplementationOnce(async () => {
      f.reportHistory(completedThrough);
      throw createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }]);
    });
    await f.state.research(f.input);
    expect(f.state.stage.value).toBe('watching');
    const key = 'polkaswap-bots-opportunity-watch-v1';
    const stored = sessionStorage.getItem(key);
    f.trading.stopBot.mockClear();

    f.state.pauseForNavigation();
    expect(f.state.stage.value).toBe('welcome');
    expect(f.state.canResumeWatch.value).toBe(true);
    f.trading.bots.value = [{ ...older, name: 'Refreshed public goal' }];
    await flushPromises();

    expect(f.state.stage.value).toBe('welcome');
    expect(f.state.canResumeWatch.value).toBe(true);
    expect(f.state.watchRecovery.value!.input).toEqual(f.input);
    expect(sessionStorage.getItem(key)).toBe(stored);
    expect(f.trading.sessionActiveIds.value).toEqual([older.id]);
    expect(f.trading.stopBot).not.toHaveBeenCalled();
    expect(f.trading.pauseBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });

  it('preserves an existing running goal and executor session without creating watch recovery', async () => {
    const f = setup();
    await f.state.connectDesktop();
    f.reportAgentConnected();
    const running = { ...goalStorageBot('already-running'), status: 'running' as const };
    f.trading.bots.value = [running];
    f.trading.sessionActiveIds.value = [running.id];
    await flushPromises();
    const original = JSON.stringify(f.trading.bots.value);

    f.state.pauseForNavigation();

    expect(JSON.stringify(f.trading.bots.value)).toBe(original);
    expect(f.trading.sessionActiveIds.value).toEqual([running.id]);
    expect(f.state.selectedBot.value!.id).toBe(running.id);
    expect(f.state.stage.value).toBe('running');
    expect(f.state.watchRecovery.value).toBeNull();
    expect(f.state.desktopConnected.value).toBe(false);
    expect(f.trading.stopBot).not.toHaveBeenCalled();
    expect(f.trading.pauseBot).not.toHaveBeenCalled();
    expect(f.trading.saveLiveBot).not.toHaveBeenCalled();
    expect(f.trading.startBot).not.toHaveBeenCalled();
  });
});
