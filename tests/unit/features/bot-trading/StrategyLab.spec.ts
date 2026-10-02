import { defineComponent, h } from 'vue';
import { DOMWrapper, mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import StrategyLab from '@/features/bot-trading/components/StrategyLab.vue';
import { RESEARCH_DEFAULT_SETTINGS } from '@/features/bot-trading/research';
import { LAB_DEFAULT_SETTINGS } from '@/features/bot-trading/lab-config';
import { createPlaygroundBot } from '@/features/bot-trading/playground';
import { encodeRuleShare, ruleRecipe, RULE_RECIPE_IDS } from '@/features/bot-trading/rule-recipes';
import type { ExperimentDefinition, ExperimentRun } from '@/features/bot-trading/experiments';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  close: vi.fn(),
  cancel: vi.fn(),
  dispose: vi.fn(),
  run: vi.fn(),
  fees: vi.fn(),
  snapshot: vi.fn(),
  present: vi.fn(),
}));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/bot-trading/experiment-storage', () => ({
  createExperimentStorage: () => ({ list: mocks.list, save: mocks.save, close: mocks.close }),
}));
vi.mock('@/features/bot-trading/experiments', () => ({
  makeExperimentSnapshot: (...args: unknown[]) => mocks.snapshot(...args),
}));
vi.mock('@/features/bot-trading/research-runner', () => ({
  createExperimentRunner: (options: {
    onUpdate: (run: ExperimentRun) => void;
    awaitProgress: (checkpoint: { checkpoint: number }, signal: AbortSignal, id: string) => Promise<void>;
  }) => {
    mocks.present.mockImplementation(options.awaitProgress);
    return {
      run: async (definitions: ExperimentDefinition[]) => {
        const completed: ExperimentRun[] | undefined = await mocks.run(definitions);
        if (completed) {
          completed.forEach(options.onUpdate);
          return completed;
        }
        definitions.forEach((definition) =>
          options.onUpdate({
            ...definition,
            status: 'error',
            progress: 0,
            createdAt: Date.now(),
            error: 'bots.errors.history',
          })
        );
        return [];
      },
      cancel: mocks.cancel,
      dispose: mocks.dispose,
    };
  },
}));
const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = { ...RESEARCH_DEFAULT_SETTINGS, assetInAddress: XOR.address, assetOutAddress: VAL.address };
const wrappers: VueWrapper[] = [];
const identity = { genesisHash: 'test-chain', denominator: '1' };

/** A minimal stored public-study boundary; engine math is covered by actual research tests. */
function savedRun(): ExperimentRun {
  const bot = createPlaygroundBot(settings, assets);
  return {
    id: 'saved-run',
    name: 'Saved strategy',
    settings,
    createdAt: Date.now(),
    status: 'complete',
    progress: 1,
    fees: { ...identity, blockNumber: 123, expiresAt: Date.now() - 1000 },
    result: {
      bot,
      settings,
      result: { returnPercent: '4.125', drawdownPercent: '2.125', trades: 4, coverage: 1 },
      source: {
        history: { identity, candles: [{ timestamp: Date.now() - 7200000 }, { timestamp: Date.now() - 3600000 }] },
      },
      validation: { folds: [] },
    },
  } as unknown as ExperimentRun;
}
/** Mount the UI with mocked persistence and network boundaries; no wallet or service is contacted. */
async function render() {
  const wrapper = mount(StrategyLab, {
    props: { assets, loadHistory: vi.fn(), loadFees: mocks.fees },
    global: {
      stubs: {
        ExperimentCard: true,
        ExperimentEquity: true,
        StrategyComposer: true,
        StrategyFlow: true,
        RuleFlow: true,
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
/** Explicitly start an unsigned research batch after the user reviews the builder. */
async function selectAllPresets(wrapper: VueWrapper) {
  for (const preset of ['dca', 'threshold', 'sma']) {
    const button = wrapper.get(`[data-testid="lab-preset-${preset}"]`);
    if (!(button.element as HTMLInputElement).checked) await button.setValue(true);
  }
}

/** Every strategy stays visible and selecting one never starts research. */
async function chooseStrategy(wrapper: VueWrapper, testId: string) {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
}

async function startResearch(wrapper: VueWrapper) {
  await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
  await flushPromises();
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.list.mockResolvedValue([]);
  mocks.run.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
  mocks.fees.mockResolvedValue({ ...identity, expiresAt: Date.now() + 60000 });
  mocks.snapshot.mockReturnValue({ version: 1 });
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

it('restores shared strategy and composer views without enqueueing research or provider work', async () => {
  const wrapper = await render();
  await wrapper.setProps({ strategyPreset: 'sma', composerOpen: true });
  expect(wrapper.get('[data-testid="lab-quick-preset-sma"]').attributes('aria-pressed')).toBe('true');
  expect(wrapper.getComponent({ name: 'StrategyComposer' }).isVisible()).toBe(true);
  expect(mocks.run).not.toHaveBeenCalled();
  expect(mocks.fees).not.toHaveBeenCalled();
  await chooseStrategy(wrapper, 'lab-quick-preset-threshold');
  expect(wrapper.emitted('navigate')?.at(-1)).toEqual([{ strategy: 'threshold', composer: true }]);
  await wrapper.setProps({ strategyPreset: 'threshold', composerOpen: false });
  expect(wrapper.getComponent({ name: 'StrategyComposer' }).isVisible()).toBe(true);
  expect(wrapper.emitted('save')).toBeUndefined();
});

describe('StrategyLab', () => {
  it('uses the composer shortcut to focus its visible panel without hiding it on repeated clicks', async () => {
    const wrapper = await render();
    const section = wrapper.get('[data-testid="lab-composer-section"]');
    const focus = vi.spyOn(section.element as HTMLElement, 'focus');
    const scroll = vi.fn();
    Object.defineProperty(section.element, 'scrollIntoView', { value: scroll, configurable: true });
    const composer = wrapper.getComponent({ name: 'StrategyComposer' });
    await wrapper.get('[data-testid="lab-compose"]').trigger('click');
    await wrapper.get('[data-testid="lab-compose"]').trigger('click');
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(focus).toHaveBeenCalledTimes(2);
    expect(composer.isVisible()).toBe(true);
    expect(wrapper.getComponent({ name: 'StrategyComposer' }).vm).toBe(composer.vm);
    expect(wrapper.get('[data-testid="lab-compose"]').attributes('aria-expanded')).toBeUndefined();
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('keeps strategies and trading controls visible with optional analysis collapsed', async () => {
    const wrapper = await render();
    expect(wrapper.get('[data-testid="lab-strategy-disclosure"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-advanced"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-trading-settings"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-validation-settings"] summary').text()).toBe('bots.calmSetup.testQuality');
    expect(wrapper.get('[data-testid="lab-comparison-settings"] summary').text()).toBe('bots.lab.compareExperiments');
    expect(wrapper.get('[data-testid="lab-trade-percent"]').isVisible()).toBe(true);
    for (const selector of ['lab-validation-settings', 'lab-comparison-settings']) {
      const details = wrapper.get(`[data-testid="${selector}"]`);
      expect(details.element.tagName).toBe('DETAILS');
      expect(details.attributes('open')).toBeUndefined();
      expect(details.get('summary').exists()).toBe(true);
      expect(details.get('.lab-settings-grid').isVisible()).toBe(false);
      (details.element as HTMLDetailsElement).open = true;
      expect(details.get('.lab-settings-grid').isVisible()).toBe(true);
    }
    expect(wrapper.get('[data-testid="lab-run-batch"]').isVisible()).toBe(true);
    expect(wrapper.find('.lab-choice-change').exists()).toBe(false);
    expect(wrapper.get('[data-testid="lab-limit-summary"]').isVisible()).toBe(true);
    expect(
      wrapper.get(`[data-testid="lab-quick-preset-${LAB_DEFAULT_SETTINGS.preset}"]`).attributes('aria-pressed')
    ).toBe('true');
    expect(wrapper.find('[data-testid="lab-builder-toggle"]').exists()).toBe(false);
    for (const recipe of RULE_RECIPE_IDS) {
      expect(wrapper.get(`[data-testid="rule-recipe-${recipe}"]`).isVisible()).toBe(true);
      expect(wrapper.get(`[data-testid="rule-recipe-${recipe}"]`).text()).toContain(
        `bots.rules.recipes.${recipe}.name`
      );
    }
    expect(wrapper.find('[data-testid="rule-name"]').exists()).toBe(false);
    expect(mocks.run).not.toHaveBeenCalled();
    await selectAllPresets(wrapper);
    await chooseStrategy(wrapper, 'lab-quick-preset-sma');
    expect(wrapper.get('[data-testid="lab-quick-preset-sma"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="lab-strategy-disclosure"]').isVisible()).toBe(true);
    await startResearch(wrapper);
    expect(mocks.run.mock.calls[0][0]).toHaveLength(1);
    expect(mocks.run.mock.calls[0][0][0].settings.preset).toBe('sma');
    for (const recipe of RULE_RECIPE_IDS) {
      expect(wrapper.get(`[data-testid="rule-recipe-${recipe}"]`).isVisible()).toBe(true);
    }
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('activates a visible recipe without running and switches cleanly back to one quick preset', async () => {
    const wrapper = await render();
    await wrapper.setProps({ strategyPreset: 'sma' });
    await chooseStrategy(wrapper, 'rule-recipe-spring');
    expect(wrapper.get('[data-testid="rule-recipe-spring"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="rule-name"]').isVisible()).toBe(true);
    expect(wrapper.findComponent({ name: 'StrategyFlow' }).exists()).toBe(false);
    expect(wrapper.getComponent({ name: 'RuleBuilder' }).props('modelValue')).toEqual(ruleRecipe('spring'));
    expect(wrapper.get('[data-testid="lab-quick-preset-sma"]').attributes('aria-pressed')).toBe('false');
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.fees).not.toHaveBeenCalled();
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    await chooseStrategy(wrapper, 'lab-quick-preset-dca');
    expect(wrapper.get('[data-testid="rule-recipe-spring"]').attributes('aria-pressed')).toBe('false');
    expect(wrapper.find('[data-testid="rule-name"]').exists()).toBe(false);
    expect(wrapper.getComponent({ name: 'StrategyFlow' }).props('settings').preset).toBe('dca');
    await startResearch(wrapper);
    expect(mocks.run.mock.calls[0][0]).toHaveLength(1);
    expect(mocks.run.mock.calls[0][0][0].settings.preset).toBe('dca');
  });

  it('keeps one full library and a Run action after the preview and settings, including after teleport', async () => {
    const wrapper = await render();
    const controls = wrapper.get('[data-testid="lab-market-controls"]');
    const picker = controls.get('[data-testid="lab-strategy-picker"]');
    expect(picker.findAll('button')).toHaveLength(12);
    expect(wrapper.findAll('[data-testid="lab-strategy-picker"]')).toHaveLength(1);
    const amount = controls.get('[data-testid="lab-capital"]').element;
    const run = controls.get('[data-testid="lab-run-batch"]').element;
    expect(amount.compareDocumentPosition(picker.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const history = controls.get('[data-testid="lab-history-range"]').element;
    const preview = controls.get('[data-testid="lab-strategy-preview"]');
    expect(picker.element.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(history.compareDocumentPosition(preview.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(preview.element.compareDocumentPosition(run) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(preview.findAll('strategy-flow-stub')).toHaveLength(1);
    expect(wrapper.findComponent({ name: 'RuleBuilder' }).exists()).toBe(false);
    expect(wrapper.get('.lab-builder').findAll('rule-flow-stub, strategy-flow-stub')).toHaveLength(0);
    expect(wrapper.find('[data-testid="lab-run-selected"]').exists()).toBe(false);
    expect(controls.get('[data-testid="lab-advanced"]').element.contains(run)).toBe(false);
    const target = document.createElement('div');
    target.id = 'all-strategies-entry';
    document.body.appendChild(target);
    try {
      await wrapper.setProps({ marketControlsTarget: '#all-strategies-entry' });
      expect(new DOMWrapper(target).get('[data-testid="lab-strategy-picker"]').findAll('button')).toHaveLength(12);
      expect(wrapper.find('[data-testid="lab-strategy-picker"]').exists()).toBe(false);
      const moved = new DOMWrapper(target);
      expect(moved.findAll('[data-testid="lab-strategy-preview"]')).toHaveLength(1);
      expect(moved.get('[data-testid="lab-strategy-disclosure"]').isVisible()).toBe(true);
      expect(moved.get('[data-testid="lab-advanced"]').isVisible()).toBe(true);
      expect(moved.findAll('[data-testid="lab-run-batch"]')).toHaveLength(1);
      expect(moved.get('[data-testid="lab-run-batch"]').isVisible()).toBe(true);
    } finally {
      wrapper.unmount();
      target.remove();
    }
  });

  it.each(RULE_RECIPE_IDS)(
    'activates the exact %s recipe from the unified picker without starting work',
    async (recipe) => {
      const wrapper = await render();
      await chooseStrategy(wrapper, `rule-recipe-${recipe}`);
      expect(wrapper.getComponent({ name: 'RuleBuilder' }).props('modelValue')).toEqual(ruleRecipe(recipe));
      const preview = wrapper.get('[data-testid="lab-strategy-preview"]');
      expect(preview.findAll('rule-flow-stub')).toHaveLength(1);
      expect(wrapper.findAllComponents({ name: 'RuleFlow' })).toHaveLength(1);
      expect(wrapper.getComponent({ name: 'RuleFlow' }).props('rules')).toEqual(ruleRecipe(recipe));
      expect(wrapper.findAll('[data-testid="lab-strategy-picker"] [aria-pressed="true"]')).toHaveLength(1);
      expect(wrapper.get(`[data-testid="rule-recipe-${recipe}"]`).attributes('aria-pressed')).toBe('true');
      expect(wrapper.get('[data-testid="lab-selected-strategy-idea"]').text()).toBe(
        `bots.rules.recipes.${recipe}.idea`
      );
      expect(mocks.run).not.toHaveBeenCalled();
      expect(mocks.fees).not.toHaveBeenCalled();
      expect(wrapper.emitted('start')).toBeUndefined();
      expect(wrapper.emitted('save')).toBeUndefined();
    }
  );

  it('updates the single preview from edits and replaces invalid rules with a visible error above Run', async () => {
    const wrapper = await render();
    await chooseStrategy(wrapper, 'rule-recipe-spring');

    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('36');
    expect(wrapper.getComponent({ name: 'RuleFlow' }).props('rules').entry.conditions[0].window).toBe(36);

    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('0');
    expect(wrapper.findComponent({ name: 'RuleFlow' }).exists()).toBe(false);
    expect(wrapper.get('[data-testid="lab-strategy-preview"] [role="alert"]').text()).toBe('bots.rules.invalid');
    expect(wrapper.get('[data-testid="lab-run-batch"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="lab-run-selected"]').exists()).toBe(false);
    expect(mocks.run).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('48');
    expect(wrapper.findAllComponents({ name: 'RuleFlow' })).toHaveLength(1);
    expect(wrapper.find('[data-testid="lab-preview-invalid"]').exists()).toBe(false);
  });

  it('shows only parameters that affect the selected strategies', async () => {
    const wrapper = await render();
    await chooseStrategy(wrapper, 'lab-quick-preset-dca');
    expect(wrapper.find('[data-testid="lab-dip-percent"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="lab-fast-window"]').exists()).toBe(false);
    await chooseStrategy(wrapper, 'lab-quick-preset-threshold');

    expect(wrapper.get('[data-testid="lab-dip-percent"]').isVisible()).toBe(true);
    await chooseStrategy(wrapper, 'lab-quick-preset-sma');
    expect(wrapper.find('[data-testid="lab-dip-percent"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="lab-fast-window"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-slow-window"]').isVisible()).toBe(true);
    await chooseStrategy(wrapper, 'rule-recipe-spring');
    expect(wrapper.find('[data-testid="lab-fast-window"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="lab-slow-window"]').exists()).toBe(false);

    expect(wrapper.get('[data-testid="rule-window-entry-0"]').isVisible()).toBe(true);
  });

  it('keeps signal timing explicit and preserves its choice when switching strategies', async () => {
    const wrapper = await render();
    await chooseStrategy(wrapper, 'lab-quick-preset-sma');
    expect(wrapper.get('[data-testid="lab-signal-timing"]').isVisible()).toBe(true);

    expect(wrapper.get('[data-testid="lab-signal-timing"]').element).toHaveProperty('value', 'live-price');
    await wrapper.get('[data-testid="lab-signal-timing"]').setValue('closed-hour');
    await startResearch(wrapper);
    const first = mocks.run.mock.calls[0][0][0] as ExperimentDefinition;
    expect(first.settings.signalTiming).toBe('closed-hour');
    expect(createPlaygroundBot(first.settings, assets).strategy.signalTiming).toBe('closed-hour');
    await chooseStrategy(wrapper, 'lab-quick-preset-dca');
    expect(wrapper.find('[data-testid="lab-signal-timing"]').exists()).toBe(false);
    await startResearch(wrapper);
    const second = mocks.run.mock.calls[1][0][0] as ExperimentDefinition;
    expect(createPlaygroundBot(second.settings, assets).strategy.kind).toBe('dca');
    expect(createPlaygroundBot(second.settings, assets).strategy.signalTiming).toBeUndefined();
    await chooseStrategy(wrapper, 'lab-quick-preset-sma');
    expect(wrapper.get('[data-testid="lab-signal-timing"]').element).toHaveProperty('value', 'closed-hour');

    await wrapper.get('[data-testid="lab-reset-defaults"]').trigger('click');
    expect(wrapper.get('[data-testid="lab-signal-timing"]').element).toHaveProperty('value', 'closed-hour');
    expect(mocks.run).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('uses the explicitly selected history range and keeps full history available', async () => {
    const wrapper = await render();
    await startResearch(wrapper);
    const first = mocks.run.mock.calls[0][0][0].settings;
    expect(first.historyEndAt - first.historyStartAt).toBe(90 * 86400000);
    await wrapper.get('[data-testid="lab-history-range"]').setValue('30');
    await startResearch(wrapper);
    const second = mocks.run.mock.calls[1][0][0].settings;
    expect(second.historyEndAt - second.historyStartAt).toBe(30 * 86400000);
    await wrapper.get('[data-testid="lab-history-range"]').setValue('all');
    await startResearch(wrapper);
    expect(mocks.run.mock.calls[2][0][0].settings.historyStartAt).toBe(RESEARCH_DEFAULT_SETTINGS.historyStartAt);
  });

  it('resets trading and validation controls without replacing the selected market, amount or edited strategy', async () => {
    const wrapper = await render();
    await chooseStrategy(wrapper, 'lab-quick-preset-threshold');
    await wrapper.get('[data-testid="lab-input-token"]').setValue(VAL.address);
    await wrapper.get('[data-testid="lab-output-token"]').setValue(PSWAP.address);
    await wrapper.get('[data-testid="lab-capital"]').setValue('17.5');
    await wrapper.get('[data-testid="lab-history-range"]').setValue('30');

    await wrapper.get('[data-testid="lab-interval-blocks"]').setValue('2400');
    await wrapper.get('[data-testid="lab-trade-percent"]').setValue('25');
    await wrapper.get('[data-testid="lab-dip-percent"]').setValue('12');

    await wrapper.get('[data-testid="lab-validation-settings"] select').setValue('none');
    await selectAllPresets(wrapper);
    await wrapper.get('[data-testid="lab-variations"]').setValue('3');
    await wrapper.get('[data-testid="lab-add-output"]').setValue(XOR.address);
    await wrapper.get('[data-testid="lab-reset-defaults"]').trigger('click');
    expect(mocks.run).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="lab-history-range"]').element).toHaveProperty('value', '90');
    expect(wrapper.get('[data-testid="lab-quick-preset-threshold"]').attributes('aria-pressed')).toBe('true');
    await startResearch(wrapper);
    const definitions = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
    expect(definitions).toHaveLength(1);
    expect(definitions[0].settings).toMatchObject({
      assetInAddress: VAL.address,
      assetOutAddress: PSWAP.address,
      capital: '17.5',
      preset: 'threshold',
      thresholdPercent: 12,
      tradePercent: LAB_DEFAULT_SETTINGS.tradePercent,
      intervalBlocks: LAB_DEFAULT_SETTINGS.intervalBlocks,
      validation: 'walk-forward',
      trainPercent: 60,
      folds: 3,
      optimize: false,
    });
    expect(definitions[0].settings.historyEndAt! - definitions[0].settings.historyStartAt!).toBe(90 * 86400000);
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('shows saved analysis and its evidence alongside the outcome without another click', async () => {
    mocks.list.mockResolvedValue([savedRun()]);
    const wrapper = await render();
    expect(wrapper.get('[data-testid="lab-more-analysis"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-comparison"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-decisions"]').isVisible()).toBe(true);

    expect(wrapper.get('[data-testid="lab-comparison"]').isVisible()).toBe(true);
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.fees).not.toHaveBeenCalled();
  });

  it('renders saved rule evidence immediately without a disclosure or an extra animation toggle', async () => {
    const run = savedRun();
    run.strategy = { ...run.result!.bot.strategy, kind: 'rules', rules: ruleRecipe('spring') };
    mocks.list.mockResolvedValue([run]);
    const wrapper = await render();
    const evidence = wrapper.get('[data-testid="lab-rule-evidence"]');
    expect(evidence.isVisible()).toBe(true);
    expect(evidence.getComponent({ name: 'RuleFlow' }).props('rules')).toEqual(run.strategy.rules);
    expect(evidence.getComponent({ name: 'RuleFlow' }).props('active')).toBe(true);
    expect(wrapper.get('[data-testid="lab-inspection"]').text()).toContain('bots.lab.feeAssumptions');
    expect(wrapper.get('[data-testid="lab-validation-settings"]').element.tagName).toBe('DETAILS');
    expect(wrapper.get('[data-testid="lab-comparison-settings"]').element.tagName).toBe('DETAILS');
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('offers practice explicitly without granting a live start intent', async () => {
    mocks.list.mockResolvedValue([savedRun()]);
    const wrapper = await render();
    wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('savePaper');
    await flushPromises();
    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('focuses the exact result settings for a blocked-order review without altering the saved study', async () => {
    const run = savedRun();
    run.settings = { ...run.settings, capital: '17.5', tradePercent: 25, intervalBlocks: 2400 };
    const original = structuredClone(run.settings);
    mocks.list.mockResolvedValue([run]);
    const wrapper = await render();
    const orderInput = wrapper.get('[data-testid="lab-trade-percent"]').element as HTMLElement;
    const focus = vi.spyOn(orderInput, 'focus');
    const scroll = vi.fn();
    Object.defineProperty(orderInput, 'scrollIntoView', { value: scroll, configurable: true });
    wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('reviewSettings', 'order-size');
    await flushPromises();
    expect(wrapper.get('[data-testid="lab-advanced"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-trading-settings"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-capital"]').element).toHaveProperty('value', '17.5');
    expect(wrapper.get('[data-testid="lab-trade-percent"]').element).toHaveProperty('value', '25');
    expect(wrapper.get('[data-testid="lab-history-range"]').element).toHaveProperty('value', 'custom');
    expect(focus).toHaveBeenCalledOnce();
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(run.settings).toEqual(original);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it.each(['rules', 'fees'] as const)(
    'keeps both rules and trading settings visible when reviewing saved %s',
    async (field) => {
      const run = savedRun();
      run.strategy = { ...run.result!.bot.strategy, kind: 'rules', rules: ruleRecipe('spring') };
      const original = structuredClone(run);
      mocks.list.mockResolvedValue([run]);
      const wrapper = await render();
      wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('reviewSettings', field);
      await flushPromises();
      expect(wrapper.get('[data-testid="lab-advanced"]').isVisible()).toBe(true);
      expect(
        wrapper.get(`[data-testid="${field === 'rules' ? 'lab-rule-settings' : 'lab-trading-settings'}"]`).isVisible()
      ).toBe(true);
      expect(
        wrapper.get(`[data-testid="${field === 'rules' ? 'lab-trading-settings' : 'lab-rule-settings'}"]`).isVisible()
      ).toBe(true);
      expect(wrapper.get('[data-testid="lab-validation-settings"] summary').text()).toBe('bots.calmSetup.testQuality');
      expect(run).toEqual(original);
      expect(mocks.run).not.toHaveBeenCalled();
    }
  );

  it('keeps the reviewed custom strategy name and explanation when another result is selected', async () => {
    const reviewed = savedRun();
    reviewed.name = 'Exact saved trigger';
    reviewed.strategy = {
      ...createPlaygroundBot(settings, assets).strategy,
      kind: 'threshold',
      threshold: '7.25',
      direction: 'above',
    };
    const other = { ...savedRun(), id: 'other-run', name: 'Other result' };
    mocks.list.mockResolvedValue([reviewed, other]);
    const wrapper = await render();

    await wrapper.get('[data-testid="lab-comparison-scope"]').setValue('all');
    const cards = wrapper.findAllComponents({ name: 'ExperimentCard' });
    cards.find((card) => card.props('run').id === reviewed.id)!.vm.$emit('reviewSettings', 'rules');
    await flushPromises();
    expect(wrapper.get('[data-testid="lab-custom-explanation"]').text()).toContain('Exact saved trigger');
    expect(wrapper.get('[data-testid="lab-custom-explanation"]').text()).toContain('7.25');
    expect(wrapper.findComponent({ name: 'StrategyFlow' }).exists()).toBe(false);
    cards.find((card) => card.props('run').id === other.id)!.vm.$emit('select');
    await flushPromises();
    await startResearch(wrapper);
    const definitions = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('Exact saved trigger');
    expect(definitions[0].strategy).toMatchObject({ kind: 'threshold', threshold: '7.25', direction: 'above' });
  });

  it('renders a single pair selector before all lab content and preserves its draft when moved to the page top', async () => {
    const wrapper = await render();
    expect(wrapper.element.firstElementChild?.getAttribute('data-testid')).toBe('lab-market-controls');
    const target = document.createElement('div');
    target.id = 'test-market-controls';
    document.body.appendChild(target);
    try {
      await wrapper.setProps({ marketControlsTarget: '#test-market-controls' });
      const controls = new DOMWrapper(target);
      expect(wrapper.find('[data-testid="lab-input-token"]').exists()).toBe(false);
      expect(controls.findAll('[data-testid="lab-input-token"]')).toHaveLength(1);
      await controls.get('[data-testid="lab-output-token"]').setValue(PSWAP.address);
      await controls.get('[data-testid="lab-capital"]').setValue('25');
      expect(controls.get('[data-testid="lab-run-batch"]').isVisible()).toBe(true);
      await controls.get('[data-testid="lab-run-batch"]').trigger('click');
      await flushPromises();
      const definitions = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
      expect(definitions.every((run) => run.settings.assetOutAddress === PSWAP.address)).toBe(true);
      expect(definitions.every((run) => run.settings.capital === '25')).toBe(true);
      expect(controls.get('[data-testid="lab-market-controls"]').isVisible()).toBe(true);
      await wrapper.setProps({ active: false });
      expect(controls.get('[data-testid="lab-market-controls"]').isVisible()).toBe(false);
      await wrapper.setProps({ active: true, marketControlsTarget: undefined });
      expect(wrapper.get('[data-testid="lab-output-token"]').element).toHaveProperty('value', PSWAP.address);
      expect(target.children).toHaveLength(0);
    } finally {
      wrapper.unmount();
      target.remove();
    }
  });

  it('keeps the primary run action after the amount and visible editor', async () => {
    const wrapper = await render();
    const action = wrapper.get('[data-testid="lab-run-batch"]');
    const amount = wrapper.get('[data-testid="lab-capital"]');
    expect(wrapper.get('[data-testid="lab-market-controls"]').element.contains(action.element)).toBe(true);
    expect(amount.element.compareDocumentPosition(action.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(action.text()).toContain('bots.uxLab.runResults');
    expect(wrapper.findAll('[data-testid="lab-run-batch"]')).toHaveLength(1);
    await startResearch(wrapper);
    expect(wrapper.get('[data-testid="lab-advanced"]').isVisible()).toBe(true);
    expect(action.isVisible()).toBe(true);
    expect(action.text()).toContain('bots.uxLab.runAgain');
    await amount.setValue('25.5');
    await startResearch(wrapper);
    expect(mocks.run).toHaveBeenCalledTimes(2);
    const first = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
    const second = mocks.run.mock.calls[1][0] as ExperimentDefinition[];
    expect(first.every((run) => run.settings.capital === '100')).toBe(true);
    expect(second.every((run) => run.settings.capital === '25.5')).toBe(true);
    expect(second.every((run) => !first.some((prior) => prior.id === run.id))).toBe(true);
  });

  it.each(['', '0', '-1', '1e2', '1000000001', '0.0000000000000000001'])(
    'explains invalid exact starting capital %j beside the run action without queuing work',
    async (capital) => {
      const wrapper = await render();
      const amount = wrapper.get('[data-testid="lab-capital"]');
      await amount.setValue(capital);
      expect(amount.attributes('aria-invalid')).toBe('true');
      expect(wrapper.get(`#${amount.attributes('aria-describedby')}`).text()).toContain('bots.uxLab.capitalRequired');
      expect(wrapper.get('[data-testid="lab-run-batch"]').attributes('disabled')).toBeDefined();
      await startResearch(wrapper);
      expect(mocks.run).not.toHaveBeenCalled();
      await amount.setValue('1.000000000000000001');
      expect(amount.attributes('aria-invalid')).toBe('false');
      expect(wrapper.get('[data-testid="lab-run-batch"]').attributes('disabled')).toBeUndefined();
    }
  );

  it('shows real running state in the primary action and blocks duplicate batches', async () => {
    let finish!: (runs: ExperimentRun[]) => void;
    mocks.run.mockImplementationOnce(() => new Promise<ExperimentRun[]>((resolve) => (finish = resolve)));
    const wrapper = await render();
    await startResearch(wrapper);
    const action = wrapper.get('[data-testid="lab-run-batch"]');
    expect(action.text()).toContain('bots.uxLab.runningResults');
    expect(action.attributes('aria-busy')).toBe('true');
    expect(action.attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('[data-testid="lab-strategy-picker"] button:disabled')).toHaveLength(12);
    expect(wrapper.get('.lab-compare-presets').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="lab-strategy-picker"]').isVisible()).toBe(true);

    expect(wrapper.get('[data-testid="lab-strategy-picker"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-launch"] [role="progressbar"]').attributes('aria-valuenow')).toBe('0');
    await action.trigger('click');
    expect(mocks.run).toHaveBeenCalledTimes(1);
    finish([]);
    await flushPromises();
    expect(action.attributes('aria-busy')).toBe('false');
    expect(action.attributes('disabled')).toBeUndefined();
    expect(action.text()).toContain('bots.uxLab.runAgain');
  });

  it('runs an exact editable composition with an explicit cadence and no automatic rule tuning', async () => {
    const wrapper = await render();
    expect(wrapper.get('[data-testid="lab-interval-blocks"]').element).toHaveProperty(
      'value',
      String(LAB_DEFAULT_SETTINGS.intervalBlocks)
    );
    await chooseStrategy(wrapper, 'rule-recipe-quiet');

    await wrapper.get('[data-testid="rule-operator-entry"]').setValue('any');
    await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
    await flushPromises();
    const definitions = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
    expect(definitions).toHaveLength(1);
    expect(definitions[0].strategy?.kind).toBe('rules');
    expect(definitions[0].strategy?.rules?.entry.operator).toBe('any');
    expect(definitions[0].strategy?.rules?.entry.conditions[1].kind).toBe('mad');
    expect(definitions[0].settings.optimize).toBe(false);
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('restores shared conditions without research and disables invalid drafts', async () => {
    const wrapper = await render();
    await wrapper.setProps({ sharedRules: encodeRuleShare(ruleRecipe('dip')) });
    expect(wrapper.getComponent({ name: 'RuleBuilder' }).props('editing')).toBe(true);
    expect(wrapper.get('[data-testid="rule-kind-entry-0"]').element).toHaveProperty('value', 'return-quantile');
    expect(mocks.run).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('0');
    expect(wrapper.get('[data-testid="lab-run-batch"]').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ sharedRules: 'malformed' });
    expect(wrapper.text()).toContain('bots.rules.invalidLink');
  });
  it('starts one configured strategy only after an explicit preview', async () => {
    const wrapper = await render();
    expect(mocks.run).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="lab-run-batch"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="lab-data-status"]').text()).toContain('bots.uxLab.readyToTest');
    expect(wrapper.getComponent({ name: 'StrategyFlow' }).props('settings').preset).toBe(LAB_DEFAULT_SETTINGS.preset);
    await startResearch(wrapper);
    expect(mocks.run).toHaveBeenCalledTimes(1);
    const definitions = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
    expect(definitions.map((item) => item.settings.preset)).toEqual([LAB_DEFAULT_SETTINGS.preset]);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(1);
    expect(wrapper.get('[data-testid="lab-input-token"]').element).toHaveProperty('value', XOR.address);
    expect(wrapper.get('[data-testid="lab-output-token"]').element).toHaveProperty('value', VAL.address);
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(definitions.every((item) => item.settings.intervalBlocks === LAB_DEFAULT_SETTINGS.intervalBlocks)).toBe(
      true
    );
    expect(wrapper.find('[data-testid="lab-pause"]').exists()).toBe(false);
  });

  it('does not claim verified history or start research when tokens arrive', async () => {
    const wrapper = mount(StrategyLab, {
      props: { assets: [], loadHistory: vi.fn(), loadFees: mocks.fees },
      global: { stubs: { ExperimentCard: true, ExperimentEquity: true, StrategyComposer: true, StrategyFlow: true } },
    });
    wrappers.push(wrapper);
    await flushPromises();
    expect(wrapper.get('[data-testid="lab-data-status"]').text()).toContain('bots.uxLab.waitingForAssets');
    expect(wrapper.get('[data-testid="lab-run-batch"]').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ assets });
    expect(mocks.run).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="lab-data-status"]').text()).toContain('bots.uxLab.readyToTest');
  });

  it('keeps one primary choice and its explanation stable when adding comparison runs', async () => {
    const wrapper = await render();
    await chooseStrategy(wrapper, 'lab-quick-preset-sma');

    await wrapper.get('[data-testid="lab-preset-dca"]').setValue(true);
    expect(wrapper.getComponent({ name: 'StrategyFlow' }).props('settings').preset).toBe('sma');
    expect(wrapper.get('[data-testid="lab-quick-preset-sma"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.findAll('[data-testid="lab-strategy-picker"] [aria-pressed="true"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="lab-selected-strategy-idea"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid^="lab-explain-"]').exists()).toBe(false);

    await wrapper.get('[data-testid="lab-preset-sma"]').setValue(false);
    expect(wrapper.get('[data-testid="lab-quick-preset-dca"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.getComponent({ name: 'StrategyFlow' }).props('settings').preset).toBe('dca');
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('explains an empty strategy selection without claiming market tokens are missing', async () => {
    const wrapper = await render();

    await wrapper.get(`[data-testid="lab-preset-${LAB_DEFAULT_SETTINGS.preset}"]`).setValue(false);
    expect(wrapper.get('[data-testid="lab-data-status"]').text()).toContain('bots.motion.selectStrategy');
    expect(wrapper.get('[data-testid="lab-run-batch"]').attributes('disabled')).toBeDefined();
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('keeps unlike saved studies out of the default comparison but lets users inspect all', async () => {
    const first = savedRun();
    const different = { ...savedRun(), id: 'other-market', settings: { ...settings, assetOutAddress: PSWAP.address } };
    mocks.list.mockResolvedValue([first, different]);
    const wrapper = await render();
    expect(wrapper.findAll('[data-testid="lab-comparison"] tbody tr')).toHaveLength(1);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(1);
    expect(wrapper.getComponent({ name: 'ExperimentEquity' }).props('results')).toHaveLength(1);

    await wrapper.get('[data-testid="lab-comparison-scope"]').setValue('all');
    expect(wrapper.findAll('[data-testid="lab-comparison"] tbody tr')).toHaveLength(2);
    expect(wrapper.text()).toContain('bots.uxLab.unlikeWarning');
    const comparison = wrapper.get('[data-testid="lab-comparison"]').element;
    const decisions = wrapper.get('[data-testid="lab-decisions"]').element;
    expect(decisions.compareDocumentPosition(comparison) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps unrelated completed returns out while the selected batch is pending or unavailable', async () => {
    const previous = savedRun();
    previous.settings = { ...settings, assetOutAddress: PSWAP.address };
    mocks.list.mockResolvedValue([previous]);
    let finish!: () => void;
    mocks.run.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    const wrapper = await render();
    await startResearch(wrapper);
    const currentIds = (mocks.run.mock.calls[0][0] as ExperimentDefinition[]).map((definition) => definition.id);
    const visibleRowIds = () =>
      wrapper.findAll('[data-testid="lab-comparison"] tbody tr').map((row) => row.attributes('data-run-id'));
    expect(visibleRowIds()).toEqual(expect.arrayContaining(currentIds));
    expect(visibleRowIds()).toHaveLength(currentIds.length);
    expect(wrapper.find('[data-testid="lab-comparison"] [data-run-id="saved-run"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'ExperimentEquity' }).exists()).toBe(false);
    finish();
    await flushPromises();
    expect(visibleRowIds()).toHaveLength(currentIds.length);
    expect(wrapper.find('[data-testid="lab-comparison"] [data-run-id="saved-run"]').exists()).toBe(false);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(1);

    await wrapper.get('[data-testid="lab-comparison-scope"]').setValue('all');
    expect(visibleRowIds()).toHaveLength(currentIds.length + 1);
    expect(visibleRowIds()).toContain('saved-run');

    await wrapper.get('[data-testid="lab-comparison-scope"]').setValue('matching');
    expect(visibleRowIds()).toHaveLength(currentIds.length);
  });

  it('retains the comparison reference when the last chart trace is unchecked', async () => {
    mocks.list.mockResolvedValue([savedRun()]);
    const wrapper = await render();

    await wrapper.get('[data-testid="lab-comparison"] input[type="checkbox"]').setValue(false);
    expect(wrapper.findAll('[data-testid="lab-comparison"] tbody tr')).toHaveLength(1);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(0);
    expect(wrapper.findComponent({ name: 'ExperimentEquity' }).exists()).toBe(false);
    await wrapper.get('[data-testid="lab-comparison"] input[type="checkbox"]').setValue(true);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(1);
  });

  it('summarizes the current batch independently of completed saved research', async () => {
    const previous = savedRun();
    previous.settings = { ...settings, assetOutAddress: PSWAP.address };
    mocks.list.mockResolvedValue([0, 1, 2].map((index) => ({ ...previous, id: `previous-${index}` })));
    let finish!: (runs: ExperimentRun[]) => void;
    mocks.run.mockImplementationOnce(() => new Promise<ExperimentRun[]>((resolve) => (finish = resolve)));
    const wrapper = await render();
    await selectAllPresets(wrapper);
    const summary = () => wrapper.get('.lab-run-toolbar strong').text().replace(/\s+/g, '');
    expect(summary()).toBe('3/3');
    await startResearch(wrapper);
    expect(summary()).toBe('0/3');
    expect(wrapper.get('.lab-compute-progress').attributes('aria-valuenow')).toBe('0');
    expect(wrapper.classes()).toContain('is-running');
    await wrapper.setProps({ active: false });
    expect(wrapper.classes()).not.toContain('is-running');
    expect(mocks.cancel).not.toHaveBeenCalled();
    await wrapper.setProps({ active: true });
    expect(wrapper.classes()).toContain('is-running');
    const definitions = mocks.run.mock.calls[0][0] as ExperimentDefinition[];
    const result = savedRun();
    finish(definitions.map((definition) => ({ ...result, ...definition })));
    await flushPromises();
    expect(summary()).toBe('3/3');
    expect(wrapper.find('.lab-compute-progress').exists()).toBe(false);
    expect(mocks.save).toHaveBeenCalledTimes(3);

    await wrapper.get('[data-testid="lab-comparison-scope"]').setValue('all');
    expect(wrapper.findAll('[data-testid="lab-comparison"] tbody tr')).toHaveLength(6);
    expect(summary()).toBe('3/3');
  });

  it('preserves saved cadence when duplicating and offers explicit whole-hour edits', async () => {
    const old = savedRun();
    old.settings = { ...old.settings, intervalBlocks: undefined, intervalHours: 12 };
    mocks.list.mockResolvedValue([old]);
    const wrapper = await render();
    wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('duplicate');
    await flushPromises();
    expect(wrapper.get('[data-testid="lab-interval-blocks"]').element).toHaveProperty('value', '7200');
    await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
    await flushPromises();
    expect(mocks.run.mock.calls.at(-1)![0][0].settings.intervalBlocks).toBeUndefined();

    await wrapper.get('[data-testid="lab-interval-blocks"]').setValue('2400');
    await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
    await flushPromises();
    expect(mocks.run.mock.calls.at(-1)![0][0].settings.intervalBlocks).toBe(2400);
  });

  it('waits for each mounted lane to finish presenting its actual checkpoint', async () => {
    let settle!: () => void;
    const paint = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    const card = defineComponent({
      setup(_props, { expose }) {
        expose({ waitForCheckpoint: paint });
        return () => h('div');
      },
    });
    const wrapper = mount(StrategyLab, {
      props: { assets, loadHistory: vi.fn(), loadFees: mocks.fees },
      global: { stubs: { ExperimentCard: card, ExperimentEquity: true, StrategyComposer: true, StrategyFlow: true } },
    });
    wrappers.push(wrapper);
    await flushPromises();
    await startResearch(wrapper);
    const id = mocks.run.mock.calls[0][0][0].id;
    let presented = false;
    const signal = new AbortController().signal;
    const pending = mocks.present({ checkpoint: 7 }, signal, id).then(() => {
      presented = true;
    });
    await flushPromises();
    expect(paint).toHaveBeenCalledWith(7, signal);
    expect(presented).toBe(false);
    settle();
    await pending;
    expect(presented).toBe(true);
  });

  it('uses newly selected tokens and additional output markets in subsequent batches', async () => {
    const wrapper = await render();
    await selectAllPresets(wrapper);
    await wrapper.get('[data-testid="lab-input-token"]').setValue(VAL.address);
    await wrapper.get('[data-testid="lab-output-token"]').setValue(PSWAP.address);

    await wrapper.get('[data-testid="lab-add-output"]').setValue(XOR.address);
    await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
    await flushPromises();
    const definitions = mocks.run.mock.calls.at(-1)![0] as ExperimentDefinition[];
    expect(definitions).toHaveLength(6);
    expect(definitions.every((item) => item.settings.assetInAddress === VAL.address)).toBe(true);
    expect(new Set(definitions.map((item) => item.settings.assetOutAddress))).toEqual(
      new Set([PSWAP.address, XOR.address])
    );
  });

  it('keeps all experiments while showing at most three, and persists shortlist identifiers only', async () => {
    const wrapper = await render();
    await selectAllPresets(wrapper);

    await wrapper.get('[data-testid="lab-variations"]').setValue('3');
    await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
    await flushPromises();
    expect(mocks.run.mock.calls.at(-1)![0]).toHaveLength(9);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(3);
    const card = wrapper.getComponent({ name: 'ExperimentCard' });
    card.vm.$emit('pin');
    await flushPromises();
    expect(JSON.parse(localStorage.getItem('polkaswap.bot-lab.pins.v1')!)).toHaveLength(1);
    const entries = JSON.parse(localStorage.getItem('polkaswap.bot-lab.pins.v1')!);
    expect(entries.every((entry: unknown) => typeof entry === 'string')).toBe(true);
  });

  it('bounds retained research across repeated batches while keeping the latest runs usable', async () => {
    const wrapper = await render();
    await selectAllPresets(wrapper);
    await startResearch(wrapper);
    const firstId = mocks.run.mock.calls[0][0][0].id;

    await wrapper.get('[data-testid="lab-variations"]').setValue('3');
    for (let index = 0; index < 6; index++) {
      await wrapper.get('[data-testid="lab-run-batch"]').trigger('click');
      await flushPromises();
    }

    await wrapper.get('[data-testid="lab-comparison-scope"]').setValue('all');
    expect(wrapper.findAll('[data-testid="lab-comparison"] tbody tr')).toHaveLength(45);
    expect(wrapper.find(`[data-run-id="${firstId}"]`).exists()).toBe(false);
    expect(wrapper.findAll('experiment-card-stub')).toHaveLength(3);
    const latest = mocks.run.mock.calls.at(-1)![0][0].id;
    expect(wrapper.find(`[data-run-id="${latest}"]`).exists()).toBe(true);
  });

  it('restores saved studies and keeps them while focusing the composer or editing a duplicate', async () => {
    const study = savedRun();
    mocks.list.mockResolvedValue([study]);
    const wrapper = await render();
    expect(mocks.run).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Saved strategy');
    const validation = wrapper.getComponent({ name: 'ValidationReport' });
    expect(validation.props('validation')).toEqual(study.result?.validation);
    await wrapper.setProps({ active: false });
    expect(validation.props('active')).toBe(false);
    expect(validation.props('validation')).toEqual(study.result?.validation);

    await wrapper.get('[data-testid="lab-compose"]').trigger('click');
    expect(wrapper.findComponent({ name: 'StrategyComposer' }).exists()).toBe(true);
    wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('duplicate');
    await flushPromises();
    expect(wrapper.text()).toContain('Saved strategy');
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it('preserves the composer settings identity during unrelated result updates and communicates a busy batch', async () => {
    let finish!: () => void;
    mocks.run.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    const wrapper = await render();
    await startResearch(wrapper);

    await wrapper.get('[data-testid="lab-compose"]').trigger('click');
    const composer = wrapper.getComponent({ name: 'StrategyComposer' });
    const original = composer.props('settings');
    expect(composer.props('busy')).toBe(true);
    wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('pin');
    await flushPromises();
    expect(composer.props('settings')).toBe(original);
    finish();
    await flushPromises();
    expect(composer.props('busy')).toBe(false);
    expect(composer.props('settings')).toBe(original);
  });

  it('duplicates exact reviewed rules with a name that remains valid for bot promotion', async () => {
    const run = savedRun();
    run.name = 'A'.repeat(80);
    run.strategy = { ...run.result!.bot.strategy };
    mocks.list.mockResolvedValue([run]);
    const wrapper = await render();
    wrapper.getComponent({ name: 'ExperimentCard' }).vm.$emit('duplicate');
    await flushPromises();
    const duplicate = mocks.run.mock.calls[0][0][0];
    expect(duplicate.name).toHaveLength(80);
    expect(duplicate.name).toMatch(/ · bots\.lab\.copy$/);
    expect(duplicate.strategy).toEqual(run.strategy);
    expect(run.name).toBe('A'.repeat(80));
  });

  it('revalidates current identity before emitting the exact strategy as a fresh bot template', async () => {
    const run = savedRun();
    mocks.list.mockResolvedValue([run]);
    const wrapper = await render();

    await wrapper.get('[data-testid="lab-create-bot"]').trigger('click');
    await flushPromises();
    expect(mocks.fees).toHaveBeenCalledWith(run.result!.bot, run.result!.settings);
    const emitted = wrapper.emitted('start')![0];
    expect(wrapper.emitted('save')).toBeUndefined();
    expect((emitted[0] as { name: string }).name).toBe(run.name);
    expect((emitted[0] as { strategy: unknown }).strategy).toEqual(run.result!.bot.strategy);
    expect(emitted[0]).not.toBe(run.result!.bot);
    expect(emitted[3]).toEqual(run.result!.source.history.identity);
    expect(emitted[3]).not.toBe(run.result!.source.history.identity);
    expect(mocks.snapshot).toHaveBeenCalledWith(run.result, run.fees);
  });

  it('blocks promotion after chain or denomination changes and reports a useful error', async () => {
    mocks.list.mockResolvedValue([savedRun()]);
    mocks.fees.mockResolvedValue({ ...identity, denominator: '1000', expiresAt: Date.now() + 60000 });
    const wrapper = await render();

    await wrapper.get('[data-testid="lab-create-bot"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.text()).toContain('bots.lab.promotionUnavailable');
  });

  it('keeps research usable when persistence is unavailable and disposes its workers', async () => {
    mocks.list.mockRejectedValue(new Error('storage unavailable'));
    const wrapper = await render();
    expect(wrapper.text()).toContain('bots.lab.storageUnavailable');
    expect(mocks.run).not.toHaveBeenCalled();
    await startResearch(wrapper);
    expect(mocks.run).toHaveBeenCalled();
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(mocks.dispose).toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
});
