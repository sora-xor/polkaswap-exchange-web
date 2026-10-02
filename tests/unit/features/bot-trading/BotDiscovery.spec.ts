import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BotDiscovery from '@/features/bot-trading/components/BotDiscovery.vue';
import DiscoveryVisuals from '@/features/bot-trading/components/DiscoveryVisuals.vue';
import { VAL, XOR } from '@/lib/substrate/sdk/assets/consts';
import type { DiscoveryFinalist, DiscoverySession } from '@/features/bot-trading/discovery';
import type { DiscoveryCampaignReview } from '@/features/bot-trading/controller';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  clear: vi.fn(),
  overlaps: vi.fn(),
  createProvider: vi.fn(),
  pair: vi.fn(),
  suggest: vi.fn(),
  listModels: vi.fn(),
  selectModel: vi.fn(),
  disconnect: vi.fn(),
  createEngine: vi.fn(),
  start: vi.fn(),
  resume: vi.fn(),
  run: vi.fn(),
  pause: vi.fn(),
  dispose: vi.fn(),
  summarize: vi.fn(),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string, values?: { count?: number }) => `${key}${values?.count ?? ''}` }),
}));
vi.mock('@/features/bot-trading/discovery-storage', () => ({
  loadDiscoverySession: (...args: unknown[]) => mocks.load(...args),
  createIndexedDbDiscoveryStore: () => ({ clear: mocks.clear, findHoldoutOverlaps: mocks.overlaps }),
}));
vi.mock('@/features/bot-trading/discovery-provider', () => ({
  createDiscoveryProvider: (...args: unknown[]) => mocks.createProvider(...args),
}));
vi.mock('@/features/bot-trading/discovery', () => ({
  createDiscoveryEngine: (...args: unknown[]) => mocks.createEngine(...args),
  createDiscoveryWindow: () => ({ startAt: 1, trainingEndAt: 2, holdoutStartAt: 3, endAt: 4 }),
  discoveryNextRequestAt: () => null,
  rankDiscoveryCandidates: (candidates: unknown[]) => [...candidates],
}));
vi.mock('@/features/bot-trading/discovery-live-feedback', () => ({
  summarizeDiscoveryLiveFeedback: (...args: unknown[]) => mocks.summarize(...args),
}));

const assets = [VAL, XOR].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const pairKey = `${VAL.address}>${XOR.address}`;
const wrappers: VueWrapper[] = [];
const metrics = {
  returnPercent: '3',
  excessReturnPercent: '1',
  benchmarkReturnPercent: '2',
  drawdownPercent: '2',
  trades: 12,
  coverage: 1,
  startAt: 1,
  endAt: 2,
};
const liveProgress = () => ({
  successfulSwaps: 1,
  activeMs: 3_600_000,
  outcome: 'active',
  openedOutputCodec: '10000000000000000000',
  latestOutputCodec: '11000000000000000000',
  benchmarkOutputCodec: '10500000000000000000',
  peakOutputCodec: '12000000000000000000',
  maxDrawdownPercent: '10',
});

/** Synthetic complete public checkpoint; no price history or live wallet state is used. */
/** Qualified synthetic finalist with no external market or wallet dependency. */
function finalist(): DiscoveryFinalist {
  return {
    id: 'candidate-1',
    pairKey,
    callNumber: 1,
    status: 'qualified',
    holdoutState: 'complete',
    strategy: {
      kind: 'dca',
      amount: '1',
      intervalMs: 86_400_000,
      threshold: '0',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    training: metrics,
    holdout: metrics,
    template: {
      assetIn: assets[0],
      assetOut: assets[1],
      policy: {
        feeBudgetCodec: '100000000000000000',
        maxTradeCodec: { [VAL.address]: '1000000000000000000', [XOR.address]: '2000000000000000000' },
      },
      portfolio: { initial: { [VAL.address]: '10000000000000000000' } },
    },
  } as unknown as DiscoveryFinalist;
}

function checkpoint(complete = false): DiscoverySession {
  const candidate = finalist();
  return {
    version: 1,
    id: 'saved-discovery',
    createdAt: 1,
    updatedAt: 2,
    status: complete ? 'complete' : 'paused',
    phase: complete ? 'complete' : 'researching',
    idea: 'Use completed-hour trend',
    callCap: 12,
    callsUsed: 2,
    capital: '10',
    feeBudgetXor: '0.1',
    maxDrawdownPercent: '5',
    assets,
    pairs: [{ key: pairKey, assetInAddress: VAL.address, assetOutAddress: XOR.address, status: 'ready' }],
    candidates: complete ? [candidate] : [],
    finalists: complete ? [candidate] : [],
    selectedIds: [],
    failedCalls: 0,
    feedbackExploratory: false,
  } as unknown as DiscoverySession;
}

/** Funding review returned by the mocked controller after explicit user review. */
function review(): DiscoveryCampaignReview {
  return {
    id: 'review-1',
    expiresAt: Date.now() + 60_000,
    campaign: { committedXorCodec: '1000000000000000000' },
    mark: { blockNumber: 123 },
    funding: {
      sufficient: true,
      assets: [{ asset: assets[0], availableCodec: '20000000000000000000', requiredCodec: '10000000000000000000' }],
    },
    bots: [],
  } as unknown as DiscoveryCampaignReview;
}

/** Mount the discovery view with inert provider, history, and wallet callbacks. */
async function render(overrides: Record<string, unknown> = {}) {
  const prepare = vi.fn().mockResolvedValue(review());
  const authorize = vi.fn().mockResolvedValue(undefined);
  const wrapper = mount(BotDiscovery, {
    props: {
      assets,
      loadHistory: vi.fn(),
      loadFees: vi.fn(),
      walletConnected: true,
      externalWallet: false,
      walletIdentity: 'wallet-one',
      campaigns: [],
      campaignBots: [],
      prepareResume: vi.fn(),
      pauseCampaign: vi.fn(),
      closeCampaign: vi.fn(),
      readCampaignOrders: vi.fn().mockResolvedValue([]),
      prepare,
      authorize,
      ...overrides,
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, prepare, authorize };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.load.mockResolvedValue(null);
  mocks.clear.mockResolvedValue(undefined);
  mocks.overlaps.mockResolvedValue([]);
  mocks.pair.mockResolvedValue(undefined);
  mocks.listModels.mockResolvedValue([{ id: 'claude-test', name: 'Claude Test', createdAt: 1 }]);
  mocks.createProvider.mockImplementation(() => ({
    pair: mocks.pair,
    suggest: mocks.suggest,
    listModels: mocks.listModels,
    selectModel: mocks.selectModel,
    disconnect: mocks.disconnect,
  }));
  mocks.start.mockResolvedValue(checkpoint());
  mocks.resume.mockImplementation(async (session: DiscoverySession) => session);
  mocks.run.mockResolvedValue(checkpoint());
  mocks.pause.mockResolvedValue(checkpoint());
  mocks.dispose.mockResolvedValue(undefined);
  mocks.summarize.mockReturnValue({
    pairKey,
    activeHours: 1,
    successfulSwaps: 1,
    netReturnPercent: '1',
    excessReturnPercent: '0.5',
    drawdownPercent: '0.2',
    feesPaidXor: '0.01',
  });
  mocks.createEngine.mockImplementation(() => ({
    start: mocks.start,
    resume: mocks.resume,
    run: mocks.run,
    pause: mocks.pause,
    dispose: mocks.dispose,
  }));
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe('BotDiscovery UI', () => {
  it('keeps pre-run data views hidden and offers settings only when opened', async () => {
    const { wrapper } = await render();
    expect(wrapper.find('[data-testid="discovery-progress"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="discovery-candidates"]').exists()).toBe(false);
    expect(wrapper.get('.discovery-advanced').element.hasAttribute('open')).toBe(false);
    expect(wrapper.get('[data-testid="discovery-start"]').exists()).toBe(true);
  });

  it('warns about previously viewed holdout dates before clearing or dispatching', async () => {
    mocks.load.mockResolvedValue(checkpoint(true));
    mocks.overlaps.mockResolvedValue([{ startAt: 3, endAt: 4 }]);
    const { wrapper } = await render();
    await wrapper.get('[data-testid="discovery-new-run"]').trigger('click');
    await flushPromises();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="discovery-holdout-preflight"]').text()).toContain(
      'bots.discovery.holdoutPreflightNote'
    );
    await wrapper.get('[data-testid="discovery-confirm-exploratory"]').trigger('click');
    await flushPromises();
    expect(mocks.clear).toHaveBeenCalledOnce();
    await wrapper.get('[data-testid="discovery-provider"]').setValue('custom');
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://relay.test/discover');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="discovery-start"]').trigger('click');
    await flushPromises();
    expect(mocks.start).toHaveBeenCalledWith(
      expect.objectContaining({ provider: { kind: 'custom', endpointHost: 'relay.test' } })
    );
    expect(wrapper.find('[data-testid="discovery-holdout-preflight"]').exists()).toBe(false);
  });

  it('confirms a changed provider before resuming saved training', async () => {
    const saved = { ...checkpoint(), provider: { kind: 'claude' as const, model: 'claude-test' } };
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    expect(wrapper.get('[data-testid="discovery-provider"]').element).toHaveProperty('value', 'claude');
    expect(wrapper.get('[data-testid="discovery-saved-provider"]').text()).toContain('claude-test');
    await wrapper.get('[data-testid="discovery-provider"]').setValue('custom');
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://relay.test/discover');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="discovery-resume"]').trigger('click');
    expect(mocks.resume).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="discovery-provider-switch"]').text()).toContain(
      'bots.discovery.providerSwitchNote'
    );
    await wrapper.get('[data-testid="discovery-confirm-provider-switch"]').trigger('click');
    await flushPromises();
    expect(mocks.resume).toHaveBeenCalledWith(saved, { kind: 'custom', endpointHost: 'relay.test' });
  });

  it('shows a saved custom adapter host and confirms a changed host before resuming', async () => {
    const saved = { ...checkpoint(), provider: { kind: 'custom' as const, endpointHost: 'first.example' } };
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    expect(wrapper.get('[data-testid="discovery-saved-provider"]').text()).toContain('first.example');
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://first.example/discover');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="discovery-resume"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://second.example/private/path');
    expect(wrapper.get('[data-testid="discovery-resume"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="discovery-resume"]').trigger('click');
    expect(mocks.resume).not.toHaveBeenCalled();
    const switchNote = wrapper.get('[data-testid="discovery-provider-switch"]').text();
    expect(switchNote).toContain('bots.discovery.providerSwitchNote');
    expect(switchNote).not.toContain('/private/path');
    await wrapper.get('[data-testid="discovery-confirm-provider-switch"]').trigger('click');
    await flushPromises();
    expect(mocks.resume).toHaveBeenCalledWith(saved, { kind: 'custom', endpointHost: 'second.example' });
  });

  it('shows the active pair, request failures, and exact rejected candidate gates', async () => {
    const saved = checkpoint();
    saved.callsUsed = 5;
    saved.failedCalls = 2;
    saved.researchProgress = { pairKey, stage: 'training' };
    saved.candidates = [
      {
        ...finalist(),
        status: 'rejected',
        reason: 'trainingGate',
        training: {
          ...metrics,
          coverage: 0.8,
          trades: 3,
          returnPercent: '-1',
          excessReturnPercent: '-2',
          drawdownPercent: '7',
        },
      },
    ];
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    expect(wrapper.get('[data-testid="discovery-current-stage"]').text()).toContain('VAL → XOR');
    expect(wrapper.get('.discovery-progress-detail').text()).toContain('bots.discovery.requestProgress');
    const reason = wrapper.get('.discovery-candidate-reason').text();
    for (const key of ['coverage', 'tradeMinimum', 'netReturn', 'holding', 'drawdown'])
      expect(reason).toContain(`bots.discovery.reason.${key}`);
  });

  it('rounds candidate metrics for reading while retaining exact values and a singular hour label', async () => {
    const saved = checkpoint(true);
    const candidate = finalist();
    candidate.strategy.intervalMs = 3_600_000;
    candidate.training = {
      ...metrics,
      returnPercent: '-8.365732142857142857142857142857',
      excessReturnPercent: '12.530000000000000000000000000001',
      drawdownPercent: '4.126666666666666666666666666667',
    };
    candidate.holdout = { ...metrics, returnPercent: '6.123456789012345678', excessReturnPercent: null };
    saved.candidates = [candidate];
    saved.finalists = [candidate];
    mocks.load.mockResolvedValue(saved);

    const { wrapper } = await render();
    const row = wrapper.get('.discovery-candidate');
    expect(row.text()).toContain('-8.37%');
    expect(row.text()).toContain('12.53%');
    expect(row.text()).toContain('4.13%');
    expect(row.text()).toContain('6.12%');
    expect(row.text()).not.toContain('8.365732142857142857');
    expect(row.findAll('.discovery-candidate-metrics strong')[0].attributes('title')).toBe(
      '-8.365732142857142857142857142857%'
    );
    expect(row.get('.discovery-candidate-rule').text()).toContain('bots.startFlow.hourly');
    expect(row.get('.discovery-holdout').text()).toContain('bots.discovery.excess —');
  });

  it('switches between Claude Code and custom HTTPS, clears credentials, and never starts research on connection', async () => {
    const { wrapper } = await render();
    await wrapper.get('[data-testid="discovery-provider"]').setValue('claude-code');
    await wrapper.get('[data-testid="discovery-pair-code"]').setValue('a'.repeat(32));
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    expect(mocks.createProvider).toHaveBeenCalledWith('claude-code', { apiKey: '', endpoint: '' });
    expect(mocks.pair).toHaveBeenCalledWith('a'.repeat(32), expect.any(AbortSignal));
    expect(wrapper.find('[data-testid="discovery-pair-code"]').exists()).toBe(true);
    expect(wrapper.get<HTMLInputElement>('[data-testid="discovery-pair-code"]').element.value).toBe('');
    expect(mocks.suggest).not.toHaveBeenCalled();
    expect(mocks.createEngine).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="discovery-provider"]').setValue('custom');
    expect(mocks.disconnect).toHaveBeenCalled();
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://relay.test/discover');
    await wrapper.get('[data-testid="discovery-api-key"]').setValue('memory-only');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    expect(mocks.createProvider).toHaveBeenLastCalledWith('custom', {
      apiKey: 'memory-only',
      endpoint: 'https://relay.test/discover',
    });
    expect(wrapper.get<HTMLInputElement>('[data-testid="discovery-api-key"]').element.value).toBe('');
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('restores a public checkpoint but requires a new provider connection before resume', async () => {
    const saved = checkpoint();
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    expect(wrapper.get<HTMLTextAreaElement>('[data-testid="discovery-idea"]').element.value).toBe(saved.idea);
    expect(wrapper.get('[data-testid="discovery-resume"]').attributes('disabled')).toBeDefined();
    expect(mocks.createProvider).not.toHaveBeenCalled();
    expect(mocks.resume).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="discovery-provider"]').setValue('custom');
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://relay.test/discover');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="discovery-resume"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="discovery-resume"]').trigger('click');
    await flushPromises();
    expect(mocks.resume).toHaveBeenCalledWith(saved, { kind: 'custom', endpointHost: 'relay.test' });
    expect(mocks.run).toHaveBeenCalledOnce();
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('resumes the frozen asset universe after the current token list changes', async () => {
    const saved = checkpoint();
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render({ assets: [...assets].reverse() });
    await wrapper.get('[data-testid="discovery-provider"]').setValue('custom');
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://relay.test/discover');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="discovery-resume"]').trigger('click');
    await flushPromises();
    expect(mocks.createEngine).toHaveBeenCalledWith(expect.objectContaining({ assets: saved.assets }));
    expect(mocks.resume).toHaveBeenCalledWith(saved, { kind: 'custom', endpointHost: 'relay.test' });
  });

  it('requires finalist selection, funding check, consent, then one wallet authorization', async () => {
    mocks.load.mockResolvedValue(checkpoint(true));
    const { wrapper, prepare, authorize } = await render();
    expect(wrapper.find('[data-testid="discovery-review"]').exists()).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
    expect(wrapper.get('.discovery-candidate-select').attributes('aria-label')).toContain('VAL → XOR');
    expect(wrapper.get('.discovery-candidate-select').attributes('aria-describedby')).toContain('candidate-1');
    await wrapper.get('.discovery-candidate-select').trigger('click');
    expect(wrapper.get('[data-testid="discovery-finalist-compare"]').text()).toContain('VAL → XOR');
    expect(wrapper.get('[data-testid="discovery-finalist-compare"]').text()).toContain('3.00%');
    await wrapper.get('[data-testid="discovery-review"]').trigger('click');
    expect(wrapper.find('[data-testid="discovery-review"]').exists()).toBe(true);
    expect(wrapper.get('.discovery-output-token').text()).toContain('bots.discovery.sellOrderLimit');
    expect(wrapper.find('[data-testid="discovery-authorize"]').exists()).toBe(false);
    await wrapper.get('[data-testid="discovery-shared-cap"]').setValue('10');
    await wrapper.get('[data-testid="discovery-check"]').trigger('click');
    await flushPromises();
    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare.mock.calls[0][0]).toMatchObject({ finalists: [{ id: 'candidate-1' }], sharedCapXor: '10' });
    expect(wrapper.get('[data-testid="discovery-funding"]').text()).toContain('123');
    expect(wrapper.get('[data-testid="discovery-authorize"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="discovery-password"]').setValue('temporary-password');
    expect(authorize).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="discovery-consent"]').setValue(true);
    await wrapper.get('[data-testid="discovery-authorize"]').trigger('click');
    await flushPromises();
    expect(authorize).toHaveBeenCalledExactlyOnceWith('review-1', 'temporary-password');
    expect(wrapper.find('[data-testid="discovery-password"]').exists()).toBe(false);
    expect(mocks.suggest).not.toHaveBeenCalled();
  });

  it('retains an expired funding check and refreshes it without losing selection or cap', async () => {
    mocks.load.mockResolvedValue(checkpoint(true));
    const { wrapper, prepare, authorize } = await render();
    prepare.mockImplementation(async () => review());
    await wrapper.get('.discovery-candidate-select').trigger('click');
    await wrapper.get('[data-testid="discovery-review"]').trigger('click');
    await wrapper.get('[data-testid="discovery-shared-cap"]').setValue('10');
    await wrapper.get('[data-testid="discovery-check"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="discovery-review-timer"]').text()).toMatch(/\d\d:\d\d/);
    const expiredAt = Date.now() + 61_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(expiredAt);
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(wrapper.get('[data-testid="discovery-review-expired"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="discovery-authorize"]').exists()).toBe(false);
    expect(wrapper.get<HTMLInputElement>('[data-testid="discovery-shared-cap"]').element.value).toBe('10');
    await wrapper.get('[data-testid="discovery-review-refresh"]').trigger('click');
    await flushPromises();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare.mock.calls[1][0].finalists).toHaveLength(1);
    expect(prepare.mock.calls[1][0].sharedCapXor).toBe('10');
    expect(wrapper.find('[data-testid="discovery-review-expired"]').exists()).toBe(false);
    expect(authorize).not.toHaveBeenCalled();
    clock.mockRestore();
  });

  it('inspects a chart candidate in place before explicitly moving to its evidence row', async () => {
    mocks.load.mockResolvedValue(checkpoint(true));
    const scroll = vi.fn();
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    try {
      const { wrapper } = await render();
      wrapper.getComponent(DiscoveryVisuals).vm.$emit('focus-candidate', 'candidate-1');
      await flushPromises();
      expect(wrapper.get('.discovery-candidate').classes()).toContain('is-focused');
      expect(wrapper.get('.discovery-candidate-select').attributes('aria-pressed')).toBe('false');
      expect(wrapper.get('[data-testid="discovery-candidate-spotlight"]').text()).toContain('3.00%');
      expect(scroll).not.toHaveBeenCalled();
      await wrapper.get('[data-testid="discovery-spotlight-view"]').trigger('click');
      await flushPromises();
      expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
    } finally {
      if (previous) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previous);
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  it('keeps an interrupted holdout sealed in the candidate list', async () => {
    const saved = checkpoint();
    saved.candidates = [{ ...finalist(), status: 'rejected', holdoutState: 'exposed' }];
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    expect(wrapper.get('.discovery-candidate').text()).toContain('bots.discovery.afterCostReturn');
    expect(wrapper.find('.discovery-holdout').exists()).toBe(false);
    expect(wrapper.find('[data-testid="discovery-finalist-compare"]').exists()).toBe(false);
  });

  it('leads a completed search with the actual no-qualified result and a readable loss', async () => {
    const saved = checkpoint(true);
    saved.finalists = [];
    saved.candidates = [
      {
        ...finalist(),
        status: 'rejected',
        reason: 'trainingGate',
        holdoutState: 'sealed',
        holdout: undefined,
        training: { ...metrics, returnPercent: '-8.37', excessReturnPercent: '6.39', drawdownPercent: '12.53' },
      },
    ];
    saved.pairs = [
      saved.pairs[0],
      { ...saved.pairs[0], key: `${XOR.address}>${VAL.address}`, status: 'skipped', reason: 'denomination' },
    ];
    mocks.load.mockResolvedValue(saved);
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    try {
      const { wrapper } = await render();
      expect(wrapper.get('[data-testid="discovery-no-qualified"]').text()).toContain('bots.discovery.noQualified');
      expect(wrapper.find('.discovery-controls').exists()).toBe(false);
      expect(wrapper.get('[data-testid="discovery-progress"] [role="progressbar"]').attributes('aria-label')).toBe(
        'bots.discovery.screened'
      );
      expect(wrapper.get('.discovery-candidate-net.is-loss').text()).toContain('-8.37%');
      expect(wrapper.get('.discovery-candidate-interpretation').text()).toContain('bots.discovery.lessLossThanHolding');
      expect(wrapper.get('.discovery-fee-assumption').text()).toContain('bots.discovery.sourceNote');
      await wrapper.get('[data-testid="discovery-outcome-inspect-skips"]').trigger('click');
      await flushPromises();
      expect(wrapper.get<HTMLDetailsElement>('[data-testid="discovery-skips"]').element.open).toBe(true);
      await wrapper.get('[data-testid="discovery-outcome-new-search"]').trigger('click');
      await flushPromises();
      expect(mocks.clear).toHaveBeenCalledOnce();
      expect(wrapper.find('.discovery-controls').exists()).toBe(true);
    } finally {
      if (previous) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previous);
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  it('separates rule entry and exit clauses in candidate evidence', async () => {
    const saved = checkpoint(true);
    const candidate = finalist();
    candidate.strategy = {
      ...candidate.strategy,
      kind: 'rules',
      rules: {
        version: 1,
        entry: { operator: 'all', conditions: [{ kind: 'trend', window: 12, direction: 'above' }] },
        exit: { operator: 'all', conditions: [{ kind: 'rsi', window: 24, direction: 'below', threshold: '30' }] },
      },
    };
    saved.candidates = [candidate];
    saved.finalists = [candidate];
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    const clauses = wrapper.findAll('.discovery-rule-breakdown p');
    expect(clauses).toHaveLength(2);
    expect(clauses[0].text()).toContain('bots.rules.entry');
    expect(clauses[1].text()).toContain('bots.rules.exit');
  });

  it('shows unavailable completed holdout excess without a percent suffix', async () => {
    const saved = checkpoint();
    saved.candidates = [
      {
        ...finalist(),
        status: 'rejected',
        holdout: { ...metrics, excessReturnPercent: null },
      },
    ];
    mocks.load.mockResolvedValue(saved);
    const { wrapper } = await render();
    const holdout = wrapper.get('.discovery-holdout').text();
    expect(holdout).toContain('bots.discovery.excess —');
    expect(holdout).not.toContain('—%');
  });

  it('keeps the user selection order through comparison and campaign review', async () => {
    const saved = checkpoint(true);
    const first = finalist();
    const second = { ...finalist(), id: 'candidate-2', callNumber: 2 };
    saved.candidates = [first, second];
    saved.finalists = [first, second];
    mocks.load.mockResolvedValue(saved);
    const { wrapper, prepare } = await render();
    const select = wrapper.findAll('.discovery-candidate-select');
    await select[1].trigger('click');
    await select[0].trigger('click');
    expect(
      wrapper.findAll('[data-testid="discovery-finalist-card"]').map((card) => card.attributes('data-finalist-id'))
    ).toEqual(['candidate-2', 'candidate-1']);
    await wrapper.get('[data-testid="discovery-review"]').trigger('click');
    await wrapper.get('[data-testid="discovery-shared-cap"]').setValue('10');
    await wrapper.get('[data-testid="discovery-check"]').trigger('click');
    await flushPromises();
    expect(prepare.mock.calls[0][0].finalists.map((candidate: DiscoveryFinalist) => candidate.id)).toEqual([
      'candidate-2',
      'candidate-1',
    ]);
  });

  it('shows the direction of marked returns smaller than one display basis point', async () => {
    const opened = '100000000000000000000';
    const campaign = {
      id: 'campaign-tiny-return',
      status: 'paused',
      botIds: ['tiny-bot'],
      progress: {
        'tiny-bot': {
          ...liveProgress(),
          openedOutputCodec: opened,
          latestOutputCodec: (BigInt(opened) - 1n).toString(),
          benchmarkOutputCodec: opened,
          peakOutputCodec: opened,
        },
      },
    };
    const bot = { id: 'tiny-bot', assetIn: assets[0], assetOut: assets[1] };
    const { wrapper } = await render({ campaigns: [campaign], campaignBots: [bot] });
    expect(wrapper.get('.discovery-live-performance').text()).toContain('-<0.01%');
    await wrapper.setProps({
      campaigns: [
        {
          ...campaign,
          progress: {
            'tiny-bot': {
              ...campaign.progress['tiny-bot'],
              latestOutputCodec: (BigInt(opened) + 1n).toString(),
            },
          },
        },
      ],
    });
    expect(wrapper.get('.discovery-live-performance').text()).toContain('<0.01%');
    expect(wrapper.get('.discovery-live-performance').text()).not.toContain('-<0.01%');
  });

  it('discards a funding review if the limits change while its request is in flight', async () => {
    mocks.load.mockResolvedValue(checkpoint(true));
    let completeReview!: (value: DiscoveryCampaignReview) => void;
    const prepare = vi.fn().mockImplementation(
      () =>
        new Promise<DiscoveryCampaignReview>((resolve) => {
          completeReview = resolve;
        })
    );
    const { wrapper } = await render({ prepare });
    await wrapper.get('.discovery-candidate-select').trigger('click');
    await wrapper.get('[data-testid="discovery-review"]').trigger('click');
    await wrapper.get('[data-testid="discovery-shared-cap"]').setValue('10');
    await wrapper.get('[data-testid="discovery-check"]').trigger('click');
    expect(prepare).toHaveBeenCalledOnce();
    await wrapper.get('.discovery-review-fields input').setValue('4');
    completeReview(review());
    await flushPromises();
    expect(wrapper.find('[data-testid="discovery-authorize"]').exists()).toBe(false);
  });

  it('shares only a selected aggregate after a separate opt-in', async () => {
    const campaign = {
      id: 'campaign-1',
      status: 'paused',
      botIds: ['live-bot'],
      progress: { 'live-bot': liveProgress() },
    };
    const bot = { id: 'live-bot', assetIn: assets[0], assetOut: assets[1] };
    const readCampaignOrders = vi.fn().mockResolvedValue([]);
    const { wrapper } = await render({ campaigns: [campaign], campaignBots: [bot], readCampaignOrders });
    expect(wrapper.get('.discovery-live-performance').text()).toContain('10.00%');
    expect(wrapper.get('.discovery-live-performance').text()).toContain('5.00%');
    expect(wrapper.get('[data-testid="discovery-campaign-progress"]').text()).toContain('8.3333%');
    await wrapper.get('[data-testid="discovery-provider"]').setValue('custom');
    await wrapper.get('[data-testid="discovery-endpoint"]').setValue('https://relay.test/discover');
    await wrapper.get('[data-testid="discovery-connect"]').trigger('click');
    await flushPromises();
    expect(readCampaignOrders).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="discovery-feedback-opt-in"]').setValue(true);
    await wrapper.get('[data-testid="discovery-feedback-bot"]').setValue('live-bot');
    await wrapper.get('[data-testid="discovery-start"]').trigger('click');
    await flushPromises();
    expect(readCampaignOrders).toHaveBeenCalledExactlyOnceWith('campaign-1');
    expect(mocks.summarize).toHaveBeenCalledOnce();
    expect(mocks.start.mock.calls[0][0]).toMatchObject({
      shareLiveFeedback: true,
      liveFeedback: { pairKey, successfulSwaps: 1, feesPaidXor: '0.01' },
    });
  });

  it('requires a fresh review and unlock to resume a paused live campaign', async () => {
    const campaign = {
      id: 'campaign-1',
      status: 'paused',
      botIds: ['live-bot'],
      progress: { 'live-bot': liveProgress() },
    };
    const prepareResume = vi.fn().mockResolvedValue({ ...review(), id: 'campaign-1' });
    const authorize = vi.fn().mockResolvedValue(undefined);
    const { wrapper } = await render({
      campaigns: [campaign],
      campaignBots: [{ id: 'live-bot', assetIn: assets[0], assetOut: assets[1] }],
      prepareResume,
      authorize,
    });
    expect(wrapper.find('[data-testid="discovery-resume-review"]').exists()).toBe(false);
    await wrapper.get('.discovery-live-actions button').trigger('click');
    await flushPromises();
    expect(prepareResume).toHaveBeenCalledExactlyOnceWith('campaign-1');
    expect(wrapper.get('[data-testid="discovery-resume-authorize"]').attributes('disabled')).toBeDefined();
    await wrapper.get('.discovery-resume-review input[type="checkbox"]').setValue(true);
    await wrapper.get<HTMLInputElement>('.discovery-resume-review input[type="password"]').setValue('new-grant');
    await wrapper.get('[data-testid="discovery-resume-authorize"]').trigger('click');
    await flushPromises();
    expect(authorize).toHaveBeenCalledExactlyOnceWith('campaign-1', 'new-grant');
    expect(wrapper.find('[data-testid="discovery-resume-review"]').exists()).toBe(false);
  });

  it('explains when a paused campaign needs the built-in wallet before review', async () => {
    const campaign = {
      id: 'campaign-1',
      status: 'paused',
      botIds: ['live-bot'],
      progress: { 'live-bot': liveProgress() },
    };
    const prepareResume = vi.fn();
    const { wrapper } = await render({
      campaigns: [campaign],
      campaignBots: [{ id: 'live-bot', assetIn: assets[0], assetOut: assets[1] }],
      walletConnected: false,
      prepareResume,
    });
    const actions = wrapper.get('.discovery-live-actions');
    expect(actions.text()).toContain('bots.discovery.walletRequired');
    await actions.get('button').trigger('click');
    expect(wrapper.emitted('wallet')).toHaveLength(1);
    expect(prepareResume).not.toHaveBeenCalled();

    await wrapper.setProps({ walletConnected: true, externalWallet: true });
    expect(actions.text()).toContain('bots.discovery.externalWallet');
    expect(actions.find('button').exists()).toBe(false);
  });

  it('requires an explicit second action to close and release a paused campaign', async () => {
    const campaign = {
      id: 'campaign-1',
      status: 'paused',
      botIds: ['live-bot'],
      progress: { 'live-bot': liveProgress() },
    };
    const closeCampaign = vi.fn().mockResolvedValue(undefined);
    const { wrapper } = await render({
      campaigns: [campaign],
      campaignBots: [{ id: 'live-bot', assetIn: assets[0], assetOut: assets[1] }],
      closeCampaign,
    });
    await wrapper.findAll('.discovery-live-actions button')[1].trigger('click');
    expect(wrapper.get('[data-testid="discovery-close-confirm"]').text()).toContain('bots.discovery.closeNote');
    expect(closeCampaign).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="discovery-confirm-close"]').trigger('click');
    await flushPromises();
    expect(closeCampaign).toHaveBeenCalledExactlyOnceWith('campaign-1');
    expect(wrapper.find('[data-testid="discovery-close-confirm"]').exists()).toBe(false);
  });
});
