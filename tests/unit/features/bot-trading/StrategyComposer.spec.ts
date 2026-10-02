import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive, ref } from 'vue';
import StrategyComposer from '@/features/bot-trading/components/StrategyComposer.vue';
import { createBotAiClient, type BotAiClient } from '@/features/bot-trading/ai';
import {
  isCodexStrategySupported,
  registerCodexStrategyTools,
  type CodexPublicStrategyContext,
} from '@/features/bot-trading/codex-strategy';
import { ruleRecipe } from '@/features/bot-trading/rule-recipes';
import { RESEARCH_DEFAULT_SETTINGS } from '@/features/bot-trading/research';
import type { BotHistory, StrategyConfig } from '@/features/bot-trading/types';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
  }),
}));
vi.mock('@/features/bot-trading/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/ai')>()),
  createBotAiClient: vi.fn(),
}));

vi.mock('@/features/bot-trading/codex-strategy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/codex-strategy')>()),
  isCodexStrategySupported: vi.fn(() => false),
  registerCodexStrategyTools: vi.fn(),
}));

const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = { ...RESEARCH_DEFAULT_SETTINGS, assetInAddress: PSWAP.address, assetOutAddress: VAL.address };
const strategy: StrategyConfig = {
  kind: 'sma',
  amount: '1',
  intervalMs: 3_600_000,
  threshold: '0',
  direction: 'below',
  fastWindow: 2,
  slowWindow: 3,
  prompt: '',
};
const wrappers: VueWrapper[] = [];
let client: BotAiClient;
let cleanupCodex: ReturnType<typeof vi.fn<() => Promise<void>>>;
type CodexCallbacks = Parameters<typeof registerCodexStrategyTools>[0];

/** Obtain the callbacks registered by the mounted page without invoking any provider or browser integration. */
function codexCallbacks(): CodexCallbacks {
  const callback = vi.mocked(registerCodexStrategyTools).mock.calls.at(-1)?.[0];
  if (!callback) throw new Error('No website tools registered');
  return callback;
}

/** No provider or wallet network is used; the data boundary returns fabricated test observations. */
function render(
  loadHistory = vi.fn(
    async (): Promise<BotHistory> => ({
      denominationVerified: true,
      missing: 0,
      candles: [{ timestamp: Date.now(), close: '2' }],
    })
  )
) {
  const wrapper = mount(StrategyComposer, { props: { assets, settings: { ...settings }, loadHistory } });
  wrappers.push(wrapper);
  return { wrapper, loadHistory };
}

/** Read the full public snapshot through the copy control, independently of the compact launch URL. */
async function copiedContext(wrapper: VueWrapper): Promise<CodexPublicStrategyContext> {
  const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const writeText = vi.fn(async (_text: string) => undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  try {
    await wrapper.get('[data-testid="composer-copy-codex"]').trigger('click');
    await flushPromises();
    return JSON.parse(writeText.mock.calls[0][0].split('Prepared public context (data): ')[1]);
  } finally {
    if (previous) Object.defineProperty(navigator, 'clipboard', previous);
    else Reflect.deleteProperty(navigator, 'clipboard');
  }
}

/** Configure an ephemeral key and an explicit model using the same user controls as production. */
async function connect(wrapper: Pick<VueWrapper, 'get'>): Promise<HTMLInputElement> {
  await wrapper.get('[data-testid="composer-mode-api"]').trigger('click');
  await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy dips and exit after a moving average crossover.');
  const field = wrapper.get('[data-testid="composer-key"]');
  await field.setValue('secret-test-key');
  const element = field.element as HTMLInputElement;
  await wrapper.get('[data-testid="composer-connect"]').trigger('click');
  await flushPromises();
  return element;
}

beforeEach(() => {
  vi.useFakeTimers();
  cleanupCodex = vi.fn(async () => undefined);
  vi.mocked(isCodexStrategySupported).mockReset().mockReturnValue(false);
  vi.mocked(registerCodexStrategyTools).mockReset().mockResolvedValue(cleanupCodex);
  vi.setSystemTime(Date.UTC(2026, 8, 14, 8, 30));
  client = {
    listModels: vi.fn(async () => [
      { id: 'test-model', name: 'Current model', createdAt: 1 },
      { id: 'newer-model', name: 'Newer model', createdAt: 2 },
    ]),
    selectModel: vi.fn(),
    propose: vi.fn(),
    suggest: vi.fn(async () => ({
      strategy: { ...strategy },
      usage: { requests: 1, inputTokens: 10, outputTokens: 20 },
    })),
    disconnect: vi.fn(),
  };
  vi.mocked(createBotAiClient).mockReset().mockReturnValue(client);
});
afterEach(async () => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  await flushPromises();
  vi.useRealTimers();
});

describe('StrategyComposer', () => {
  it('keeps optional Codex instructions collapsed while the prompt, action and data disclosure remain visible', () => {
    const { wrapper } = render();
    const help = wrapper.get('[data-testid="composer-help"]');
    expect(help.attributes('open')).toBeUndefined();
    expect(help.get('summary').text()).toBe('assets.details');
    expect(help.get('.composer-steps').isVisible()).toBe(false);
    expect(wrapper.get('[data-testid="composer-prompt"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="composer-prepare-codex"]').isVisible()).toBe(true);
    expect(wrapper.get('.composer-codex > .composer-note').text()).toBe('bots.codex.privacy');
    expect(wrapper.get('.composer-codex > .composer-note').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="composer-account-continuity"]').exists()).toBe(false);
    (help.element as HTMLDetailsElement).open = true;
    expect(help.get('.composer-steps').isVisible()).toBe(true);
    expect(createBotAiClient).not.toHaveBeenCalled();
  });

  it('retains a reviewed draft when the same eligible catalog is refreshed', async () => {
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy dips');
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    await wrapper.setProps({ assets: assets.map((asset) => ({ ...asset })) });
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
  });

  it('loads a live model dropdown after connection, supports switching, and clears keys on provider changes', async () => {
    const { wrapper } = render();
    expect(wrapper.find('[data-testid="composer-model"]').exists()).toBe(false);
    await wrapper.get('[data-testid="composer-mode-api"]').trigger('click');
    await wrapper.get('[data-testid="composer-key"]').setValue('unsubmitted-openai-key');
    await wrapper.get('[data-testid="composer-provider"]').setValue('claude');
    expect(wrapper.get('[data-testid="composer-key"]').element).toHaveProperty('value', '');
    await wrapper.get('[data-testid="composer-key"]').setValue('test-claude-key');
    await wrapper.get('[data-testid="composer-connect"]').trigger('click');
    await flushPromises();
    expect(createBotAiClient).toHaveBeenCalledWith('claude', expect.objectContaining({ model: '' }));
    expect(client.listModels).toHaveBeenCalledOnce();
    expect(wrapper.get('[data-testid="composer-model"]').element.tagName).toBe('SELECT');
    expect(wrapper.get('[data-testid="composer-model"]').text()).toContain('Current model');
    await wrapper.get('[data-testid="composer-model"]').setValue('newer-model');
    expect(client.selectModel).toHaveBeenLastCalledWith('newer-model');
    expect(client.suggest).not.toHaveBeenCalled();
  });

  it('keeps generation disabled after a failed model lookup and retries without asking for a model ID', async () => {
    vi.mocked(client.listModels).mockRejectedValueOnce(new Error('secret-provider-error'));
    const { wrapper } = render();
    await connect(wrapper);
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.labAi.modelsUnavailable');
    expect(wrapper.get('[data-testid="composer-generate"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="composer-refresh-models"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-generate"]').attributes('disabled')).toBeUndefined();
  });

  it('keeps keys out of reactive inputs, generates only on Generate, and emits an experiment only after explicit review', async () => {
    const { wrapper, loadHistory } = render();
    const keyElement = await connect(wrapper);
    expect(keyElement.value).toBe('');
    expect(wrapper.html()).not.toContain('secret-test-key');
    expect(client.suggest).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(loadHistory).toHaveBeenCalledOnce();
    expect(client.suggest).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'paper',
        network: 'paper',
        assetIn: expect.objectContaining({ address: PSWAP.address }),
        assetOut: expect.objectContaining({ address: VAL.address }),
      }),
      expect.any(Array),
      expect.any(AbortSignal)
    );
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    expect(wrapper.emitted('propose')).toBeUndefined();
    await wrapper.get('[data-testid="composer-name"]').setValue('My crossover');
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')).toEqual([
      [
        {
          name: 'My crossover',
          strategy,
          settings: {
            ...settings,
            preset: 'sma',
            optimize: false,
            intervalBlocks: 600,
            fastWindow: 2,
            slowWindow: 3,
            signalTiming: 'closed-hour',
          },
        },
      ],
    ]);
    expect(wrapper.find('[data-testid="composer-added"]').exists()).toBe(true);
  });

  it('shows the actual one-minute request cooldown and refuses rapid duplicate requests', async () => {
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-generate"]').text()).toContain('60');
    expect(wrapper.get('[data-testid="composer-generate"]').attributes('disabled')).toBeDefined();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(wrapper.get('[data-testid="composer-generate"]').attributes('disabled')).toBeUndefined();
    expect(client.suggest).toHaveBeenCalledOnce();
  });

  it('allows generation during research and preserves edits through stable parent renders until the batch accepts them', async () => {
    const stableSettings = reactive({ ...settings });
    const batchBusy = ref(true);
    const renderTick = ref(0);
    const loadHistory = vi.fn(
      async (): Promise<BotHistory> => ({
        denominationVerified: true,
        missing: 0,
        candles: [{ timestamp: Date.now(), close: '2' }],
      })
    );
    const host = mount(
      defineComponent({
        setup: () => () =>
          h('div', { 'data-render': renderTick.value }, [
            h(StrategyComposer, { assets, settings: stableSettings, loadHistory, busy: batchBusy.value }),
          ]),
      })
    );
    wrappers.push(host);
    const wrapper = host.getComponent(StrategyComposer);
    await connect(wrapper);
    expect(wrapper.get('[data-testid="composer-generate"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="composer-amount"]').setValue('2');
    renderTick.value += 1;
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-amount"]').element).toHaveProperty('value', '2');
    expect(wrapper.get('[data-testid="composer-apply"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')).toBeUndefined();
    expect(wrapper.find('[data-testid="composer-added"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="composer-amount"]').element).toHaveProperty('value', '2');
    batchBusy.value = false;
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-apply"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')).toEqual([[expect.objectContaining({ strategy: { ...strategy, amount: '2' } })]]);
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
  });

  it('shows exact threshold sell semantics and preserves the reviewed direction when adding the experiment', async () => {
    const sellStrategy: StrategyConfig = { ...strategy, kind: 'threshold', threshold: '2', direction: 'above' };
    vi.mocked(client.suggest).mockResolvedValue({
      strategy: sellStrategy,
      usage: { requests: 1, inputTokens: 1, outputTokens: 1 },
    });
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-rule-behavior"]').text()).toBe('bots.labAi.sellAboveHelp');
    await wrapper.get('[data-testid="composer-direction"]').setValue('below');
    expect(wrapper.get('[data-testid="composer-rule-behavior"]').text()).toBe('bots.labAi.buyBelowHelp');
    await wrapper.get('[data-testid="composer-direction"]').setValue('above');
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')?.[0][0]).toMatchObject({ strategy: sellStrategy });
  });

  it('revalidates edited rules, refuses oversized buys and clears a preview when the selected market changes', async () => {
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="composer-amount"]').setValue('11');
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')).toBeUndefined();
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.labAi.reviewError');
    await wrapper.setProps({ settings: { ...settings, assetOutAddress: XOR.address } });
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
  });

  it('revokes credentials and aborts generation on disconnect, ignoring a late provider response', async () => {
    let release!: (value: Awaited<ReturnType<BotAiClient['suggest']>>) => void;
    vi.mocked(client.suggest).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    const signal = vi.mocked(client.suggest).mock.calls[0][2];
    await wrapper.get('[data-testid="composer-disconnect"]').trigger('click');
    expect(signal?.aborted).toBe(true);
    expect(client.disconnect).toHaveBeenCalledOnce();
    release({ strategy, usage: { requests: 1, inputTokens: 0, outputTokens: 0 } });
    await flushPromises();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
    expect(wrapper.emitted('propose')).toBeUndefined();
  });

  it('does not call the paid provider when the pair changes while market history is still loading', async () => {
    let release!: (history: BotHistory) => void;
    const { wrapper } = render(
      vi.fn(
        () =>
          new Promise<BotHistory>((resolve) => {
            release = resolve;
          })
      )
    );
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await wrapper.setProps({ settings: { ...settings, assetInAddress: XOR.address } });
    release({ denominationVerified: true, missing: 0, candles: [{ timestamp: Date.now(), close: '2' }] });
    await flushPromises();
    expect(client.suggest).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
  });

  it('aborts provider generation and discards its late response when the actual research settings change', async () => {
    let release!: (value: Awaited<ReturnType<BotAiClient['suggest']>>) => void;
    vi.mocked(client.suggest).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    const signal = vi.mocked(client.suggest).mock.calls[0][2];
    await wrapper.setProps({ settings: { ...settings, assetInAddress: XOR.address } });
    expect(signal?.aborted).toBe(true);
    release({ strategy, usage: { requests: 1, inputTokens: 0, outputTokens: 0 } });
    await flushPromises();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
    expect(wrapper.emitted('propose')).toBeUndefined();
  });

  it('rejects unavailable historical data before calling the provider and sanitizes provider errors', async () => {
    const { wrapper } = render(
      vi.fn(async () => {
        throw new Error('private-indexer-error');
      })
    );
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(client.suggest).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.labAi.historyError');
    await wrapper.setProps({
      loadHistory: vi.fn(async () => ({
        denominationVerified: true,
        missing: 0,
        candles: [{ timestamp: Date.now(), close: '2' }],
      })),
    });
    vi.mocked(client.suggest).mockRejectedValue(new Error('secret-test-key was rejected'));
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.labAi.generationError');
    expect(wrapper.text()).not.toContain('secret-test-key');
  });

  it('clears entered credentials on a connection validation error and on unmount', async () => {
    const { wrapper } = render();
    vi.mocked(createBotAiClient).mockImplementationOnce(() => {
      throw new Error('secret-test-key');
    });
    const keyElement = await connect(wrapper);
    expect(keyElement.value).toBe('');
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.labAi.connectionError');
    await connect(wrapper);
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(client.disconnect).toHaveBeenCalledOnce();
  });
});

describe('StrategyComposer Codex assistance', () => {
  it('offers a native launch link immediately and preserves activation with the current idea', async () => {
    const { wrapper, loadHistory } = render();
    const link = wrapper.get('[data-testid="composer-open-codex"]');
    expect(link.element.tagName).toBe('A');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
    expect(link.attributes('href')).toMatch(/^https:\/\/chatgpt\.com\/codex\/open-app\?q=/);
    expect(link.attributes('aria-disabled')).toBeUndefined();
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy dips with small trades.');
    expect(new URL(link.attributes('href')!).searchParams.get('q')).toContain('Buy dips with small trades.');
    let blockedByComponent = true;
    link.element.addEventListener('click', (event) => {
      blockedByComponent = event.defaultPrevented;
      // Exercise the handler but never launch a desktop task from this test.
      event.preventDefault();
    });
    await link.trigger('click');
    expect(blockedByComponent).toBe(false);
    expect(loadHistory).not.toHaveBeenCalled();
    expect(createBotAiClient).not.toHaveBeenCalled();
    expect(wrapper.emitted('propose')).toBeUndefined();
  });

  it('keeps app launch available when history fails', async () => {
    const { wrapper } = render(
      vi.fn(async () => {
        throw new Error('offline');
      })
    );
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy dips.');
    await wrapper.get('[data-testid="composer-prepare-codex"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.labAi.historyError');
    expect(wrapper.get('[data-testid="composer-open-codex"]').attributes('href')).toMatch(
      /^https:\/\/chatgpt\.com\/codex\/open-app\?q=/
    );
    expect(wrapper.find('[data-testid="composer-copy-codex"]').exists()).toBe(false);
  });

  it('prepares and reviews copied context while stopped website tools stay revoked', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper } = render();
    await flushPromises();
    const callbacks = codexCallbacks();
    await wrapper.get('[data-testid="composer-stop-codex"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy small scheduled amounts.');
    expect(wrapper.get('[data-testid="composer-prepare-codex"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="composer-prepare-codex"]').trigger('click');
    await flushPromises();
    const context = await copiedContext(wrapper);
    await expect(callbacks.getContext({})).rejects.toThrow('bots.codex.stopped');
    expect(() =>
      callbacks.submitDraft({ requestId: context.requestId, revision: callbacks.getRevision(), strategy })
    ).toThrow('bots.codex.stale');
    await wrapper
      .get('[data-testid="composer-result-json"]')
      .setValue(JSON.stringify({ requestId: context.requestId, strategy }));
    await wrapper.get('[data-testid="composer-review-codex"]').trigger('click');
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    expect(wrapper.emitted('propose')).toBeUndefined();
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
    expect(cleanupCodex).toHaveBeenCalledOnce();
  });

  it('defaults to Codex without a key, model or fabricated connection status in an ordinary browser', async () => {
    const { wrapper, loadHistory } = render();
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-open-codex"]').element.tagName).toBe('A');
    expect(wrapper.find('[data-testid="composer-key"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="composer-model"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="composer-generate"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('bots.codex.unavailable');
    expect(wrapper.text()).not.toContain('bots.labAi.configured');
    expect(wrapper.get('[data-testid="composer-open-codex"]').attributes('href')).toMatch(
      /^https:\/\/chatgpt\.com\/codex\/open-app\?q=/
    );
    expect(wrapper.get('[data-testid="composer-prepare-codex"]').attributes('disabled')).toBeDefined();
    expect(registerCodexStrategyTools).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="composer-retry-codex"]').exists()).toBe(true);
    expect(loadHistory).not.toHaveBeenCalled();
    expect(createBotAiClient).not.toHaveBeenCalled();
  });

  it('offers readable instructions if clipboard access fails and can copy them when access is available', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('clipboard-denied')).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { wrapper } = render();
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy a small amount.');
    await wrapper.get('[data-testid="composer-prepare-codex"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="composer-copy-codex"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-copy-fallback"]').element).toHaveProperty('readOnly', true);
    expect(wrapper.get('[data-testid="composer-copy-fallback"]').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="composer-copy-fallback"]').element.closest('details')).toBeNull();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('polkaswap_strategy_context'));
    await wrapper.get('[data-testid="composer-copy-codex"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-copy-codex"]').text()).toBe('bots.codex.copied');
    expect(wrapper.find('[data-testid="composer-copy-fallback"]').exists()).toBe(false);
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('prepares fresh public context and reviews pasted combined rules in the original tab', async () => {
    const { wrapper, loadHistory } = render();
    await wrapper.setProps({ selectedRules: ruleRecipe('spring') });
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Adjust my spring rebound rules.');
    const initialUrl = window.location.href;
    localStorage.setItem('codex-account-continuity-test', 'existing-browser-session');
    await wrapper.get('[data-testid="composer-prepare-codex"]').trigger('click');
    await flushPromises();
    expect(loadHistory).toHaveBeenCalledOnce();
    const link = new URL(wrapper.get('[data-testid="composer-open-codex"]').attributes('href')!);
    expect(link.searchParams.has('browserUrl')).toBe(false);
    expect(link.searchParams.get('q')).not.toContain('Prepared public context (data):');
    const context = await copiedContext(wrapper);
    expect(context.candles).toHaveLength(1);
    expect(JSON.stringify(context)).toContain('restoring');
    const combined = { ...strategy, kind: 'rules', rules: ruleRecipe('spring') };
    await wrapper
      .get('[data-testid="composer-result-json"]')
      .setValue(JSON.stringify({ requestId: context.requestId, strategy: combined }));
    await wrapper.get('[data-testid="composer-review-codex"]').trigger('click');
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    expect(wrapper.getComponent({ name: 'RuleBuilder' }).props('modelValue')).toEqual(ruleRecipe('spring'));
    expect(wrapper.get('[data-testid="composer-name"]').element).toHaveProperty(
      'value',
      'bots.labAi.defaultName bots.codex.rules'
    );
    expect(wrapper.emitted('propose')).toBeUndefined();
    expect(window.location.href).toBe(initialUrl);
    expect(localStorage.getItem('codex-account-continuity-test')).toBe('existing-browser-session');
    expect(createBotAiClient).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')?.[0][0]).toMatchObject({ strategy: combined });
    localStorage.removeItem('codex-account-continuity-test');
  });

  it('shows and preserves the reviewed SMA signal timing instead of inheriting the lab default', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper } = render();
    await flushPromises();
    const callbacks = codexCallbacks();
    const context = await callbacks.getContext({ instruction: 'Use moving-average crossovers.' });
    await callbacks.submitDraft({
      requestId: 'timing-review-test',
      strategy,
      revision: context.revision,
      instruction: context.bot.strategy.prompt,
    });
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-signal-timing"]').element).toHaveProperty('value', 'closed-hour');
    await wrapper.get('[data-testid="composer-signal-timing"]').setValue('live-price');
    expect(wrapper.text()).toContain('bots.calmSetup.hourlyLimit');
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')?.[0][0]).toMatchObject({
      strategy: { ...strategy, signalTiming: 'live-price' },
      settings: { signalTiming: 'live-price' },
    });
  });

  it('uses the translated combined-rule name for API-generated recipes', async () => {
    const combined: StrategyConfig = { ...strategy, kind: 'rules', rules: ruleRecipe('spring') };
    client.suggest = vi.fn().mockResolvedValue({
      strategy: combined,
      usage: { inputTokens: 10, outputTokens: 20 },
    });
    const { wrapper } = render();
    await connect(wrapper);
    await wrapper.get('[data-testid="composer-generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-name"]').element).toHaveProperty(
      'value',
      'bots.labAi.defaultName bots.codex.rules'
    );
    expect(wrapper.getComponent({ name: 'RuleBuilder' }).props('modelValue')).toEqual(combined.rules);
    expect(wrapper.emitted('propose')).toBeUndefined();
  });

  it('rejects an older direct draft after a portable task refresh without consuming the new task', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper } = render();
    await flushPromises();
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Use small scheduled buys.');
    const callbacks = codexCallbacks();
    const oldContext = await callbacks.getContext({});
    await wrapper.get('[data-testid="composer-prepare-codex"]').trigger('click');
    await flushPromises();
    expect(callbacks.getRevision()).not.toBe(oldContext.revision);
    expect(() =>
      callbacks.submitDraft({
        requestId: 'old-direct-request',
        revision: oldContext.revision,
        instruction: oldContext.bot.strategy.prompt,
        strategy,
      })
    ).toThrow('bots.codex.stale');
    const portable = await copiedContext(wrapper);
    await wrapper
      .get('[data-testid="composer-result-json"]')
      .setValue(JSON.stringify({ requestId: portable.requestId, strategy }));
    await wrapper.get('[data-testid="composer-review-codex"]').trigger('click');
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="composer-result-json"]').exists()).toBe(false);
    expect(wrapper.emitted('propose')).toBeUndefined();
  });

  it('rejects mismatched, oversized and expired portable drafts and invalidates changed selections', async () => {
    const { wrapper } = render();
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Small scheduled buys.');
    await wrapper.get('[data-testid="composer-prepare-codex"]').trigger('click');
    await flushPromises();
    const context = await copiedContext(wrapper);
    for (const value of [
      JSON.stringify({ requestId: 'wrong', strategy }),
      'x'.repeat(32769),
      JSON.stringify({ requestId: context.requestId, strategy: { ...strategy, amount: '999999999999' } }),
    ]) {
      await wrapper.get('[data-testid="composer-result-json"]').setValue(value);
      await wrapper.get('[data-testid="composer-review-codex"]').trigger('click');
      expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.codex.importError');
      expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
    }
    await vi.advanceTimersByTimeAsync(300001);
    expect(wrapper.get('[data-testid="composer-task-status"]').text()).toBe('bots.codex.expired');
    expect(wrapper.get('[data-testid="composer-open-codex"]').attributes('href')).toMatch(
      /^https:\/\/chatgpt\.com\/codex\/open-app\?q=/
    );
    expect(wrapper.get('[data-testid="composer-review-codex"]').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ selectedRules: ruleRecipe('range') });
    expect(wrapper.find('[data-testid="composer-result-json"]').exists()).toBe(false);
    expect(wrapper.emitted('propose')).toBeUndefined();
  });

  it('discovers late site tools on focus and allows explicit retry without a mode toggle', async () => {
    const { wrapper } = render();
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-retry-codex"]').exists()).toBe(true);
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('bots.codex.available');
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
    await wrapper.get('[data-testid="composer-stop-codex"]').trigger('click');
    await flushPromises();
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
    await wrapper.get('[data-testid="composer-retry-codex"]').trigger('click');
    await flushPromises();
    expect(registerCodexStrategyTools).toHaveBeenCalledTimes(2);
  });

  it('discovers site tools injected into the active tab without reloading or requiring a focus change', async () => {
    const { wrapper } = render();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(2000);
    expect(registerCodexStrategyTools).not.toHaveBeenCalled();
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('bots.codex.available');
    await vi.advanceTimersByTimeAsync(2000);
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
    await wrapper.get('[data-testid="composer-stop-codex"]').trigger('click');
    await vi.advanceTimersByTimeAsync(2000);
    expect(registerCodexStrategyTools).toHaveBeenCalledOnce();
  });

  it('stages a draft from conversational instructions without changing the idea or adding an experiment', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper, loadHistory } = render();
    await flushPromises();
    expect(wrapper.text()).toContain('bots.codex.available');
    expect(wrapper.get('[data-testid="composer-open-codex"]').attributes('href')).toMatch(
      /^https:\/\/chatgpt\.com\/codex\/open-app\?q=/
    );
    expect(wrapper.find('[data-testid="composer-retry-codex"]').exists()).toBe(false);
    expect(loadHistory).not.toHaveBeenCalled();
    const callbacks = codexCallbacks();
    const context = await callbacks.getContext({ instruction: 'Use small moving-average trades.' });
    expect(context.bot.strategy.prompt).toBe('Use small moving-average trades.');
    expect(wrapper.get('[data-testid="composer-prompt"]').element).toHaveProperty('value', '');
    await callbacks.submitDraft({
      requestId: 'test-request',
      strategy,
      revision: context.revision,
      instruction: context.bot.strategy.prompt,
    });
    await flushPromises();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="composer-amount"]').element).toHaveProperty('value', '1');
    expect(wrapper.text()).not.toContain('bots.labAi.usage');
    expect(wrapper.emitted('propose')).toBeUndefined();
    expect(createBotAiClient).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="composer-review"]').trigger('submit');
    expect(wrapper.emitted('propose')).toEqual([[expect.objectContaining({ strategy })]]);
  });

  it('preserves edited review fields when Codex refreshes public context and rejects conflicting instructions', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper } = render();
    await flushPromises();
    const callbacks = codexCallbacks();
    await wrapper.get('[data-testid="composer-prompt"]').setValue('Buy small amounts.');
    const context = await callbacks.getContext({});
    await callbacks.submitDraft({
      requestId: 'test-request',
      strategy,
      revision: context.revision,
      instruction: context.bot.strategy.prompt,
    });
    await flushPromises();
    await wrapper.get('[data-testid="composer-amount"]').setValue('2');
    await callbacks.getContext({});
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-amount"]').element).toHaveProperty('value', '2');
    await expect(callbacks.getContext({ instruction: 'Use another idea.' })).rejects.toThrow(
      'bots.codex.instructionMismatch'
    );
    expect(wrapper.get('[data-testid="composer-prompt"]').element).toHaveProperty('value', 'Buy small amounts.');
    expect(wrapper.get('[data-testid="composer-error"]').text()).toBe('bots.codex.instructionMismatch');
  });

  it.each(['instruction', 'assets', 'settings'] as const)(
    'invalidates a Codex draft and its context when %s change',
    async (changed) => {
      vi.mocked(isCodexStrategySupported).mockReturnValue(true);
      const { wrapper } = render();
      await flushPromises();
      const callbacks = codexCallbacks();
      const context = await callbacks.getContext({ instruction: 'Buy small amounts.' });
      await callbacks.submitDraft({
        requestId: 'test-request',
        strategy,
        revision: context.revision,
        instruction: context.bot.strategy.prompt,
      });
      await flushPromises();
      expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
      if (changed === 'instruction') await wrapper.get('[data-testid="composer-prompt"]').setValue('Use a new idea.');
      else if (changed === 'assets')
        await wrapper.setProps({ assets: assets.filter((asset) => asset.address !== PSWAP.address) });
      else await wrapper.setProps({ settings: { ...settings, assetOutAddress: XOR.address } });
      expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
      expect(callbacks.getRevision()).not.toBe(context.revision);
      expect(wrapper.emitted('propose')).toBeUndefined();
    }
  );

  it('keeps the original review and idea visible until a new conversational draft is submitted', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper } = render();
    await flushPromises();
    const callbacks = codexCallbacks();
    const context = await callbacks.getContext({ instruction: 'Buy small amounts.' });
    await callbacks.submitDraft({
      requestId: 'test-request',
      strategy,
      revision: context.revision,
      instruction: context.bot.strategy.prompt,
    });
    await flushPromises();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    const newContext = await callbacks.getContext({ instruction: 'Buy only after a crossover.' });
    await flushPromises();
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="composer-review-idea"]').text()).toContain('Buy small amounts.');
    expect(newContext.bot.strategy.prompt).toBe('Buy only after a crossover.');
    expect(wrapper.get('[data-testid="composer-prompt"]').element).toHaveProperty('value', '');
    await callbacks.submitDraft({
      requestId: 'new-request',
      strategy,
      revision: newContext.revision,
      instruction: newContext.bot.strategy.prompt,
    });
    await flushPromises();
    expect(wrapper.get('[data-testid="composer-review-idea"]').text()).toContain('Buy only after a crossover.');
  });

  it('requires valid current context and independently revalidates oversized Codex drafts', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    const { wrapper } = render();
    await flushPromises();
    const callbacks = codexCallbacks();
    await expect(callbacks.getContext({})).rejects.toThrow('bots.codex.contextError');
    const context = await callbacks.getContext({ instruction: 'Buy small amounts.' });
    expect(() =>
      callbacks.submitDraft({
        requestId: 'test-request',
        strategy: { ...strategy, amount: '11' },
        revision: context.revision,
        instruction: context.bot.strategy.prompt,
      })
    ).toThrow();
    expect(wrapper.emitted('propose')).toBeUndefined();
    await wrapper.setProps({ settings: { ...settings, assetOutAddress: XOR.address } });
    expect(() =>
      callbacks.submitDraft({
        requestId: 'test-request',
        strategy,
        revision: context.revision,
        instruction: context.bot.strategy.prompt,
      })
    ).toThrow('bots.codex.stale');
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
  });

  it('ignores delayed market history after website tools stop', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    let release!: (history: BotHistory) => void;
    const { wrapper } = render(
      vi.fn(
        () =>
          new Promise<BotHistory>((resolve) => {
            release = resolve;
          })
      )
    );
    await flushPromises();
    const callbacks = codexCallbacks();
    const contextResult = callbacks.getContext({ instruction: 'Buy small amounts.' });
    const rejection = expect(contextResult).rejects.toThrow('bots.codex.contextError');
    await wrapper.get('[data-testid="composer-stop-codex"]').trigger('click');
    release({ denominationVerified: true, missing: 0, candles: [{ timestamp: Date.now(), close: '2' }] });
    await rejection;
    await flushPromises();
    expect(cleanupCodex).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('bots.codex.stopped');
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
    expect(wrapper.emitted('propose')).toBeUndefined();
    await expect(callbacks.getContext({ instruction: 'Buy again.' })).rejects.toThrow('bots.codex.stopped');
    await wrapper.get('[data-testid="composer-retry-codex"]').trigger('click');
    await flushPromises();
    expect(registerCodexStrategyTools).toHaveBeenCalledTimes(2);
  });

  it('clears drafts and credentials across mode switches, unregisters tools and retries registration failures', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    vi.mocked(registerCodexStrategyTools).mockRejectedValueOnce(new Error('private-browser-error'));
    const { wrapper } = render();
    await flushPromises();
    expect(wrapper.text()).toContain('bots.codex.error');
    expect(wrapper.text()).not.toContain('private-browser-error');
    await wrapper.get('[data-testid="composer-retry-codex"]').trigger('click');
    await flushPromises();
    const callbacks = codexCallbacks();
    const context = await callbacks.getContext({ instruction: 'Buy small amounts.' });
    await callbacks.submitDraft({
      requestId: 'test-request',
      strategy,
      revision: context.revision,
      instruction: context.bot.strategy.prompt,
    });
    await connect(wrapper);
    expect(wrapper.find('[data-testid="composer-review"]').exists()).toBe(false);
    expect(cleanupCodex).toHaveBeenCalledOnce();
    await wrapper.get('[data-testid="composer-open-codex"]').trigger('click');
    await flushPromises();
    expect(client.disconnect).toHaveBeenCalledOnce();
    expect(registerCodexStrategyTools).toHaveBeenCalledTimes(3);
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    await flushPromises();
    expect(cleanupCodex).toHaveBeenCalledTimes(2);
    expect(() =>
      callbacks.submitDraft({
        requestId: 'test-request',
        strategy,
        revision: context.revision,
        instruction: context.bot.strategy.prompt,
      })
    ).toThrow('bots.codex.stale');
  });

  it('cleans up registration that finishes after the component is unmounted', async () => {
    vi.mocked(isCodexStrategySupported).mockReturnValue(true);
    let finishRegistration!: (cleanup: () => Promise<void>) => void;
    vi.mocked(registerCodexStrategyTools).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRegistration = resolve;
        })
    );
    const { wrapper } = render();
    await flushPromises();
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    finishRegistration(cleanupCodex);
    await flushPromises();
    expect(cleanupCodex).toHaveBeenCalledOnce();
  });
});
