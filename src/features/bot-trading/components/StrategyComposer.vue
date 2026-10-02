<template>
  <section class="strategy-composer" data-testid="strategy-composer" :aria-label="t('bots.labAi.title')">
    <header class="composer-heading">
      <div>
        <h3>{{ t('bots.labAi.title') }}</h3>
      </div>
      <span class="composer-state" :class="{ configured: mode === 'codex' ? codexState === 'available' : configured }">
        <i aria-hidden="true" />{{
          t(mode === 'codex' ? `bots.codex.${codexState}` : configured ? 'bots.labAi.configured' : 'bots.labAi.offline')
        }}
      </span>
    </header>

    <div class="composer-modes" role="group" :aria-label="t('bots.codex.mode')">
      <a
        class="composer-secondary"
        data-testid="composer-open-codex"
        :href="codexLink || undefined"
        target="_blank"
        rel="noopener noreferrer"
        :aria-disabled="!codexLink || undefined"
        @click="openCodexApp"
      >
        {{ t('bots.codex.useApp') }}
      </a>
      <button
        type="button"
        class="composer-text-button"
        data-testid="composer-mode-api"
        :aria-pressed="mode === 'api'"
        @click="mode = 'api'"
      >
        {{ t('bots.codex.useApi') }}
      </button>
    </div>
    <label class="composer-field composer-prompt">
      <span>{{ t(mode === 'codex' ? 'bots.codex.prompt' : 'bots.labAi.prompt') }}</span>
      <textarea
        v-model="instruction"
        data-testid="composer-prompt"
        rows="3"
        maxlength="2000"
        :disabled="generating"
        :placeholder="t('bots.labAi.promptPlaceholder')"
      />
    </label>

    <div v-if="mode === 'codex'" class="composer-codex" data-testid="composer-codex">
      <p class="composer-note">{{ t('bots.codex.privacy') }}</p>
      <button
        type="button"
        class="composer-primary"
        data-testid="composer-prepare-codex"
        :disabled="generating || !instruction.trim()"
        @click="prepareCodexTask"
      >
        {{
          t(
            generating
              ? 'bots.labAi.loadingHistory'
              : portableContext
                ? 'bots.codex.prepareAgain'
                : 'bots.codex.prepare'
          )
        }}
      </button>
      <p
        v-if="portableContext"
        role="status"
        data-testid="composer-task-status"
        :class="{ 'composer-error': taskExpired }"
      >
        {{ t(taskExpired ? 'bots.codex.expired' : 'bots.codex.prepared') }}
      </p>
      <div v-if="portableContext && !taskExpired" class="composer-handoff">
        <button
          type="button"
          class="composer-secondary"
          data-testid="composer-copy-codex"
          :disabled="!codexPrompt"
          @click="copyCodexPrompt"
        >
          {{ t(promptCopied ? 'bots.codex.copied' : 'bots.codex.copyPrompt') }}
        </button>
      </div>
      <p v-if="portableContext && !taskExpired" class="composer-note" data-testid="composer-account-continuity">
        {{ t('bots.codex.separateBrowser') }}
      </p>
      <section v-if="copyFailed && portableContext && !taskExpired" class="composer-copy-fallback">
        <h4>{{ t('bots.codex.copyManually') }}</h4>
        <textarea :value="codexPrompt" readonly rows="6" data-testid="composer-copy-fallback" />
      </section>
      <div v-if="portableContext" class="composer-import">
        <label class="composer-field">
          <span>{{ t('bots.codex.pasteResult') }}</span>
          <textarea
            v-model="codexResult"
            rows="5"
            maxlength="32768"
            spellcheck="false"
            data-testid="composer-result-json"
          />
        </label>
        <button
          type="button"
          class="composer-secondary"
          data-testid="composer-review-codex"
          :disabled="generating || taskExpired || !codexResult.trim()"
          @click="reviewCodexResult"
        >
          {{ t('bots.codex.reviewResult') }}
        </button>
      </div>
      <div class="composer-handoff">
        <button
          v-if="codexState === 'available' || codexState === 'starting'"
          type="button"
          class="composer-text-button"
          data-testid="composer-stop-codex"
          @click="codexEnabled = false"
        >
          {{ t('bots.codex.stop') }}
        </button>
        <button
          v-else
          type="button"
          class="composer-text-button"
          data-testid="composer-retry-codex"
          @click="enableCodexTools"
        >
          {{ t('bots.codex.retry') }}
        </button>
      </div>
      <details class="composer-help" data-testid="composer-help">
        <summary>{{ t('assets.details') }}</summary>
        <p>{{ t('bots.codex.description') }}</p>
        <ol class="composer-steps">
          <li>{{ t('bots.codex.stepSignIn') }}</li>
          <li>{{ t('bots.codex.stepPrompt') }}</li>
          <li>{{ t('bots.codex.stepReview') }}</li>
        </ol>
        <p class="composer-note" data-testid="composer-codex-status">
          {{ t(codexState === 'available' ? 'bots.codex.availableHelp' : 'bots.codex.browserHelp') }}
        </p>
        <a
          class="composer-text-button"
          href="https://learn.chatgpt.com/docs/chrome-extension"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('bots.codex.browserSetup') }}
        </a>
      </details>
    </div>
    <div v-if="mode === 'api' && !configured" class="composer-connection">
      <div class="composer-fields">
        <label class="composer-field">
          <span>{{ t('bots.labAi.provider') }}</span>
          <select v-model="provider" data-testid="composer-provider">
            <option value="openai">{{ t('bots.labAi.openai') }}</option>
            <option value="claude">{{ t('bots.labAi.claude') }}</option>
            <option value="custom">{{ t('bots.labAi.custom') }}</option>
          </select>
        </label>
        <label v-if="provider === 'custom'" class="composer-field">
          <span>{{ t('bots.labAi.endpoint') }}</span>
          <input
            v-model="endpoint"
            data-testid="composer-endpoint"
            type="url"
            autocomplete="off"
            spellcheck="false"
            maxlength="2048"
            :placeholder="t('bots.labAi.endpointPlaceholder')"
          />
        </label>
      </div>
      <label class="composer-field">
        <span>{{ t(provider === 'custom' ? 'bots.labAi.optionalKey' : 'bots.labAi.apiKey') }}</span>
        <input
          ref="keyInput"
          data-testid="composer-key"
          type="password"
          autocomplete="new-password"
          spellcheck="false"
          maxlength="1024"
          :placeholder="t('bots.labAi.keyPlaceholder')"
        />
      </label>
      <p class="composer-note">{{ t('bots.labAi.privacy') }}</p>
      <p v-if="provider === 'custom'" class="composer-note">{{ t('bots.labAi.customHelp') }}</p>
      <button type="button" class="composer-secondary" data-testid="composer-connect" @click="connect">
        {{ t('bots.labAi.connect') }}
      </button>
    </div>
    <div v-else-if="mode === 'api'" class="composer-connected">
      <span
        >{{ t(`bots.labAi.${provider}`) }}<small v-if="model && provider !== 'custom'"> / {{ model }}</small></span
      >
      <button type="button" class="composer-text-button" data-testid="composer-disconnect" @click="disconnect">
        {{ t('bots.labAi.disconnect') }}
      </button>
    </div>

    <div v-if="mode === 'api' && configured && provider !== 'custom'" class="composer-models">
      <label class="composer-field">
        <span>{{ t('bots.labAi.model') }}</span>
        <select
          v-model="model"
          data-testid="composer-model"
          :disabled="modelsLoading || generating"
          @change="chooseModel"
        >
          <option v-if="!model" value="" disabled>
            {{ t(modelsLoading ? 'bots.labAi.loadingModels' : 'bots.labAi.selectModel') }}
          </option>
          <option v-for="entry in models" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
        </select>
      </label>
      <button
        type="button"
        class="composer-text-button"
        data-testid="composer-refresh-models"
        :disabled="modelsLoading || generating"
        @click="refreshModels"
      >
        {{ t('bots.labAi.refreshModels') }}
      </button>
    </div>

    <button
      v-if="mode === 'api'"
      type="button"
      class="composer-primary"
      data-testid="composer-generate"
      :disabled="
        !configured ||
        modelsLoading ||
        (provider !== 'custom' && !model) ||
        generating ||
        !instruction.trim() ||
        cooldown > 0
      "
      @click="generate"
    >
      {{
        generating
          ? t(phase === 'history' ? 'bots.labAi.loadingHistory' : 'bots.labAi.generating')
          : cooldown > 0
            ? t('bots.labAi.cooldown', { seconds: cooldown })
            : t('bots.labAi.generate')
      }}
    </button>
    <div v-if="generating" class="composer-scan" aria-hidden="true"><i /></div>
    <p v-if="error" class="composer-error" role="alert" data-testid="composer-error">{{ t(error) }}</p>

    <form v-if="draft" class="composer-review" data-testid="composer-review" @submit.prevent="apply">
      <div class="composer-review-heading">
        <h4>{{ t('bots.labAi.review') }}</h4>
        <span>{{ pairLabel }}</span>
      </div>
      <p class="composer-note">{{ t('bots.labAi.reviewHelp') }}</p>
      <p v-if="previewBot?.strategy.prompt" class="composer-review-idea" data-testid="composer-review-idea">
        <strong>{{ t('bots.labAi.prompt') }}:</strong> {{ previewBot.strategy.prompt }}
      </p>
      <div class="composer-fields">
        <label class="composer-field composer-name">
          <span>{{ t('bots.labAi.name') }}</span>
          <input v-model="name" data-testid="composer-name" required maxlength="80" />
        </label>
        <label class="composer-field">
          <span>{{ t('bots.labAi.rule') }}</span>
          <select v-model="draft.kind" data-testid="composer-rule" @change="changeDraftKind">
            <option value="dca">{{ t('bots.labAi.dca') }}</option>
            <option value="threshold">{{ t('bots.labAi.threshold') }}</option>
            <option value="sma">{{ t('bots.labAi.sma') }}</option>
            <option value="rules">{{ t('bots.codex.rules') }}</option>
          </select>
        </label>
        <label class="composer-field">
          <span>{{ t('bots.labAi.amount', { token: previewBot?.assetIn.symbol }) }}</span>
          <input v-model="draft.amount" data-testid="composer-amount" inputmode="decimal" required maxlength="100" />
        </label>
        <label class="composer-field">
          <span>{{ t('bots.lab.intervalBlocks') }}</span>
          <input
            v-model.number="intervalBlocks"
            data-testid="composer-interval-blocks"
            type="number"
            :min="draft.kind === 'rules' ? 600 : 1"
            max="432000"
            step="any"
            required
          />
        </label>
        <template v-if="draft.kind === 'threshold'">
          <label class="composer-field">
            <span>{{
              t('bots.labAi.triggerPrice', { input: previewBot?.assetIn.symbol, output: previewBot?.assetOut.symbol })
            }}</span>
            <input
              v-model="draft.threshold"
              data-testid="composer-threshold"
              inputmode="decimal"
              required
              maxlength="100"
            />
          </label>
          <label class="composer-field">
            <span>{{ t('bots.labAi.direction') }}</span>
            <select v-model="draft.direction" data-testid="composer-direction">
              <option value="below">{{ t('bots.labAi.below') }}</option>
              <option value="above">{{ t('bots.labAi.above') }}</option>
            </select>
          </label>
        </template>
        <template v-if="draft.kind === 'sma'">
          <label class="composer-field">
            <span>{{ t('bots.calmSetup.signalTiming') }}</span>
            <select v-model="draftSignalTiming" data-testid="composer-signal-timing">
              <option value="closed-hour">{{ t('bots.calmSetup.hourlyCloses') }}</option>
              <option value="live-price">{{ t('bots.calmSetup.livePrices') }}</option>
            </select>
          </label>
          <label class="composer-field">
            <span>{{ t('bots.labAi.fastWindow') }}</span>
            <input v-model.number="draft.fastWindow" type="number" min="2" max="199" step="1" required />
          </label>
          <label class="composer-field">
            <span>{{ t('bots.labAi.slowWindow') }}</span>
            <input v-model.number="draft.slowWindow" type="number" min="3" max="200" step="1" required />
          </label>
        </template>
      </div>
      <RuleBuilder
        v-if="draft.kind === 'rules' && draft.rules"
        v-model="draft.rules"
        v-model:name="name"
        :show-recipes="false"
      />
      <div class="composer-evidence">
        <span>{{ t('bots.labAi.observations', { count: observationCount }) }}</span>
        <span v-if="mode === 'api'">{{
          t('bots.labAi.usage', { input: usage.inputTokens, output: usage.outputTokens })
        }}</span>
        <span v-else>{{ t('bots.codex.draftSource') }}</span>
      </div>
      <p class="composer-rule-behavior" data-testid="composer-rule-behavior">
        {{
          t(
            draft.kind === 'rules'
              ? 'bots.codex.rulesHelp'
              : draft.kind === 'threshold'
                ? draft.direction === 'above'
                  ? 'bots.labAi.sellAboveHelp'
                  : 'bots.labAi.buyBelowHelp'
                : draft.kind === 'sma'
                  ? 'bots.labAi.smaHelp'
                  : 'bots.labAi.dcaHelp'
          )
        }}
      </p>
      <p v-if="draft.kind === 'sma' && draft.signalTiming === 'live-price'" class="composer-note">
        {{ t('bots.calmSetup.hourlyLimit') }}
      </p>
      <p class="composer-note">
        {{ t('bots.labAi.limit', { amount: previewBot?.strategy.amount, token: previewBot?.assetIn.symbol }) }}
      </p>
      <p v-if="props.busy" class="composer-note">{{ t('bots.lab.waitForBatch') }}</p>
      <button type="submit" class="composer-primary" data-testid="composer-apply" :disabled="props.busy">
        {{ t('bots.labAi.apply') }}
      </button>
    </form>
    <p v-if="added" class="composer-added" role="status" data-testid="composer-added">{{ t('bots.labAi.added') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import type { BotAiModel } from '../ai-models';
import { createBotAiClient, type AiUsage, type BotAiClient } from '../ai';
import { createCodexStrategyLink, createCodexStrategyPrompt } from '../codex-handoff';
import {
  createCodexStrategyContext,
  isCodexStrategySupported,
  registerCodexStrategyTools,
  type CodexStrategyContext,
  type CodexPublicStrategyContext,
} from '../codex-strategy';
import RuleBuilder from './RuleBuilder.vue';
import { parseStrategyRules, type StrategyRules } from '../strategy-rules';
import { ruleRecipe } from '../rule-recipes';
import {
  composerMarketTail,
  composeReviewedStrategy,
  prepareComposerRequest,
  type ComposedStrategy,
} from '../strategy-composer';
import type { ResearchSettings } from '../research';
import type { BotAsset, BotDefinition, BotHistory, BotProvider, StrategyConfig } from '../types';

/** LLM-assisted rule authoring: review is explicit and this component cannot sign or start a bot. */
const props = withDefaults(
  defineProps<{
    assets: BotAsset[];
    settings: ResearchSettings;
    loadHistory: (bot: BotDefinition, settings: ResearchSettings) => Promise<BotHistory>;
    /** Existing research may continue while authoring; adding waits until its batch finishes. */
    busy?: boolean;
    /** The current selected recipe or saved strategy supplies the drafting reference. */
    selectedRules?: StrategyRules;
    selectedStrategy?: StrategyConfig;
  }>(),
  { busy: false }
);
const emit = defineEmits<{ propose: [proposal: ComposedStrategy] }>();
const { t } = useTranslation();
const keyInput = ref<HTMLInputElement | null>(null);
const mode = ref<'codex' | 'api'>('codex');
const codexEnabled = ref(true);
const codexState = ref<'starting' | 'available' | 'unavailable' | 'stopped' | 'error'>('starting');
const promptCopied = ref(false);
const copyFailed = ref(false);
const portableContext = ref<CodexPublicStrategyContext | null>(null);
const codexResult = ref('');
const taskExpired = computed(() => !!portableContext.value && clock.value >= portableContext.value.expiresAt);
const draftSignalTiming = computed({
  get: () => draft.value?.signalTiming ?? 'closed-hour',
  set: (value: 'closed-hour' | 'live-price') => {
    if (draft.value?.kind === 'sma') draft.value.signalTiming = value;
  },
});
const codexHandoff = computed(() => ({
  pageUrl: /^https?:$/.test(window.location.protocol) ? window.location.href : 'https://polkaswap.io/#/bots',
  instruction: instruction.value,
  settings: props.settings,
  assets: props.assets,
  context: portableContext.value ?? undefined,
}));
const codexTransfer = computed(() => {
  try {
    return { prompt: createCodexStrategyPrompt(codexHandoff.value), link: createCodexStrategyLink(codexHandoff.value) };
  } catch {
    return { prompt: '', link: '' };
  }
});
const codexPrompt = computed(() => codexTransfer.value.prompt);
const codexLink = computed(() => codexTransfer.value.link);
const provider = ref<BotProvider>('openai');
const model = ref('');
const models = ref<BotAiModel[]>([]);
const modelsLoading = ref(false);
const endpoint = ref('');
const instruction = ref('');
const configured = ref(false);
const phase = ref<'idle' | 'history' | 'provider'>('idle');
const generating = computed(() => phase.value !== 'idle');
const error = ref('');
const draft = ref<StrategyConfig | null>(null);
const previewBot = ref<BotDefinition | null>(null);
const name = ref('');
const usage = ref<AiUsage>({ requests: 0, inputTokens: 0, outputTokens: 0 });
const observationCount = ref(0);
const added = ref(false);
const clock = ref(Date.now());
const nextRequestAt = ref(0);
const cooldown = computed(() => Math.max(0, Math.ceil((nextRequestAt.value - clock.value) / 1000)));
const pairLabel = computed(() =>
  previewBot.value ? `${previewBot.value.assetIn.symbol} → ${previewBot.value.assetOut.symbol}` : ''
);
const intervalBlocks = computed({
  get: () => (draft.value?.intervalMs ?? 6_000) / 6_000,
  set: (value: number) => {
    if (draft.value) draft.value.intervalMs = Math.round(value * 6_000);
  },
});

// Credentials live only in the AI client's revocable closure, never in refs or persistent storage.
let client: BotAiClient | null = null;
let active: AbortController | null = null;
let requestVersion = 0;
let previewSettings: ResearchSettings | null = null;
let ticker: ReturnType<typeof setInterval> | undefined;
let mounted = false;
let registrationVersion = 0;
let unregisterCodexTools: (() => Promise<void>) | null = null;
let registrationTask: Promise<void> = Promise.resolve();
let codexContextVersion = 0;
let pendingCodexContext: {
  bot: BotDefinition;
  settings: ResearchSettings;
  revision: string;
  observationCount: number;
} | null = null;

/** Bind both delivery paths to the latest market read as well as the current form controls. */
function codexRevision(): string {
  return `${requestVersion}:${codexContextVersion}`;
}

/** Prepare a bounded public snapshot in the current tab; this never opens a browser or touches the wallet. */
async function prepareCodexTask(): Promise<void> {
  if (generating.value || !instruction.value.trim()) return;
  portableContext.value = null;
  codexResult.value = '';
  promptCopied.value = false;
  copyFailed.value = false;
  try {
    const source = await getCodexContext({}, 'manual');
    if (!mounted || source.revision !== codexRevision()) return;
    portableContext.value = createCodexStrategyContext(source);
    clock.value = Date.now();
  } catch {
    if (mounted && !error.value) error.value = 'bots.codex.contextError';
  }
}

/** Keep native link activation synchronous while revoking any previous API-mode credentials. */
function openCodexApp(event: MouseEvent): void {
  mode.value = 'codex';
  if (!codexLink.value) {
    event.preventDefault();
    error.value = 'bots.codex.contextError';
  }
}

/** Accept only the matching expiring JSON draft, then pass it through the normal exact review validation. */
function reviewCodexResult(): void {
  if (generating.value || !portableContext.value) return;
  clock.value = Date.now();
  try {
    if (taskExpired.value || codexResult.value.length > 32768) throw new Error();
    const text = codexResult.value.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1');
    const value = JSON.parse(text);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'requestId,strategy' ||
      value.requestId !== portableContext.value.requestId
    )
      throw new Error();
    submitCodexDraft({ strategy: value.strategy, revision: codexRevision() }, 'manual');
    portableContext.value = null;
    codexResult.value = '';
  } catch {
    error.value = taskExpired.value ? 'bots.codex.expired' : 'bots.codex.importError';
  }
}

/** Browser support can arrive after extension setup; retry discovery without clearing a reviewed draft. */
function refreshCodexSupport(): void {
  if (
    mounted &&
    !document.hidden &&
    mode.value === 'codex' &&
    codexEnabled.value &&
    (codexState.value === 'unavailable' || codexState.value === 'error')
  )
    syncCodexTools();
}

/** Normalize family switches so an old combined rule tree cannot survive under a basic strategy. */
function changeDraftKind(): void {
  if (!draft.value) return;
  if (draft.value.kind === 'rules') {
    draft.value.rules = props.selectedRules ? parseStrategyRules(props.selectedRules) : ruleRecipe('spring');
    draft.value.intervalMs = Math.max(3_600_000, draft.value.intervalMs);
    delete draft.value.signalTiming;
  } else {
    delete draft.value.rules;
    if (draft.value.kind !== 'sma') delete draft.value.signalTiming;
  }
}

/** Copy only the public strategy setup instructions, with a selectable fallback for restricted clipboards. */
async function copyCodexPrompt(): Promise<void> {
  clock.value = Date.now();
  if (!portableContext.value || taskExpired.value) return;
  promptCopied.value = false;
  copyFailed.value = false;
  try {
    await navigator.clipboard.writeText(codexPrompt.value);
    if (mounted) promptCopied.value = true;
  } catch {
    if (mounted) copyFailed.value = true;
  }
}

/** Read verified public market context without changing the user's form or exposing wallet/provider state. */
async function getCodexContext(
  input: { instruction?: string },
  source: 'site-tools' | 'manual' = 'site-tools'
): Promise<CodexStrategyContext> {
  if (!mounted || mode.value !== 'codex' || (source === 'site-tools' && !codexEnabled.value))
    throw new Error('bots.codex.stopped');
  const enteredInstruction = instruction.value.trim();
  if (enteredInstruction && input.instruction?.trim() && enteredInstruction !== input.instruction.trim()) {
    error.value = 'bots.codex.instructionMismatch';
    throw new Error('bots.codex.instructionMismatch');
  }
  error.value = '';
  const effectiveInstruction = enteredInstruction || input.instruction || '';
  portableContext.value = null;
  codexResult.value = '';
  const version = requestVersion;
  const contextVersion = ++codexContextVersion;
  active?.abort();
  pendingCodexContext = null;
  const controller = new AbortController();
  active = controller;
  const settings = { ...props.settings };
  try {
    const { bot, historySettings } = prepareComposerRequest(settings, props.assets, effectiveInstruction);
    phase.value = 'history';
    const history = await props.loadHistory(bot, historySettings);
    if (version !== requestVersion || contextVersion !== codexContextVersion || controller.signal.aborted)
      throw new Error('bots.codex.stale');
    const candles = composerMarketTail(history);
    pendingCodexContext = { bot, settings, revision: codexRevision(), observationCount: candles.length };
    return {
      bot,
      candles,
      revision: codexRevision(),
      settings,
      selectedRules: props.selectedRules,
      selectedStrategy: props.selectedStrategy,
    };
  } catch {
    if (version === requestVersion && contextVersion === codexContextVersion)
      error.value =
        !effectiveInstruction.trim() || effectiveInstruction.length > 2000
          ? 'bots.labAi.promptError'
          : 'bots.labAi.historyError';
    throw new Error('bots.codex.contextError');
  } finally {
    if (version === requestVersion && contextVersion === codexContextVersion) {
      phase.value = 'idle';
      active = null;
    }
  }
}

/** Stage validated deterministic rules in the existing review form; adding an experiment remains a user action. */
function submitCodexDraft(
  input: { strategy: StrategyConfig; revision: string },
  source: 'site-tools' | 'manual' = 'site-tools'
): { status: string } {
  const context = pendingCodexContext;
  if (
    !mounted ||
    mode.value !== 'codex' ||
    (source === 'site-tools' && !codexEnabled.value) ||
    input.revision !== codexRevision() ||
    !context ||
    context.revision !== input.revision
  )
    throw new Error('bots.codex.stale');
  const reviewed = composeReviewedStrategy(
    t('bots.labAi.defaultName', {
      rule: t(input.strategy.kind === 'rules' ? 'bots.codex.rules' : `bots.labAi.${input.strategy.kind}`),
    }),
    input.strategy,
    context.bot,
    context.settings
  );
  previewBot.value = context.bot;
  previewSettings = context.settings;
  observationCount.value = context.observationCount;
  pendingCodexContext = null;
  portableContext.value = null;
  codexResult.value = '';
  draft.value = { ...reviewed.strategy };
  name.value = reviewed.name;
  error.value = '';
  return { status: 'Awaiting user review. No experiment was added and no bot was started.' };
}

/** Serialize registration and teardown so a stopped or unmounted page cannot retain website tools. */
function syncCodexTools(): void {
  const version = ++registrationVersion;
  registrationTask = registrationTask
    .then(async () => {
      if (unregisterCodexTools) {
        await unregisterCodexTools();
        unregisterCodexTools = null;
      }
      if (version !== registrationVersion || !mounted || mode.value !== 'codex') return;
      if (!codexEnabled.value) {
        codexState.value = 'stopped';
        return;
      }
      if (!isCodexStrategySupported()) {
        codexState.value = 'unavailable';
        return;
      }
      codexState.value = 'starting';
      try {
        const cleanup = await registerCodexStrategyTools({
          getContext: getCodexContext,
          getRevision: codexRevision,
          submitDraft: submitCodexDraft,
        });
        if (version !== registrationVersion || !mounted || mode.value !== 'codex' || !codexEnabled.value) {
          await cleanup();
          return;
        }
        unregisterCodexTools = cleanup;
        codexState.value = 'available';
      } catch {
        if (version === registrationVersion && mounted) codexState.value = 'error';
      }
    })
    .catch(() => {
      if (version === registrationVersion && mounted) codexState.value = 'error';
    });
}

/** Let the user retry after opening a supported browser or resume after explicitly stopping website tools. */
function enableCodexTools(): void {
  if (codexEnabled.value) syncCodexTools();
  else codexEnabled.value = true;
}

/** Clear the password field immediately, then discover current provider models using the revocable client. */
async function connect(): Promise<void> {
  error.value = '';
  try {
    const apiKey = keyInput.value?.value ?? '';
    client = createBotAiClient(provider.value, { apiKey, model: model.value.trim(), endpoint: endpoint.value.trim() });
    configured.value = true;
    nextRequestAt.value = 0;
  } catch {
    error.value = 'bots.labAi.connectionError';
  } finally {
    if (keyInput.value) keyInput.value.value = '';
  }
  if (configured.value && provider.value !== 'custom') await refreshModels();
}

/** Read the provider's live catalog using the in-memory connection; never substitute typed or stale IDs. */
async function refreshModels(): Promise<void> {
  const connection = client;
  if (!connection || modelsLoading.value || generating.value) return;
  modelsLoading.value = true;
  error.value = '';
  try {
    const entries = await connection.listModels();
    if (client !== connection) return;
    models.value = entries;
    const selected =
      entries.find((entry) => entry.id === model.value) ??
      entries.find((entry) => /mini|haiku/.test(entry.id)) ??
      entries[0];
    if (!selected) throw new Error();
    if (model.value !== selected.id) invalidatePreview();
    model.value = selected.id;
    connection.selectModel(selected.id);
  } catch {
    if (client === connection) error.value = 'bots.labAi.modelsUnavailable';
  } finally {
    if (client === connection) modelsLoading.value = false;
  }
}

/** Changing an observed model clears an older review draft while retaining the revocable provider connection. */
function chooseModel(): void {
  invalidatePreview();
  try {
    client?.selectModel(model.value);
  } catch {
    error.value = 'bots.labAi.modelsUnavailable';
  }
}

/** Invalidate delayed history/provider responses whenever their original market controls no longer apply. */
function invalidatePreview(): void {
  requestVersion += 1;
  codexContextVersion += 1;
  pendingCodexContext = null;
  portableContext.value = null;
  codexResult.value = '';
  active?.abort();
  active = null;
  phase.value = 'idle';
  draft.value = null;
  previewBot.value = null;
  previewSettings = null;
  added.value = false;
  error.value = '';
  promptCopied.value = false;
  copyFailed.value = false;
}

/** Revoke the in-memory key and abort any in-flight request. */
function disconnect(): void {
  invalidatePreview();
  client?.disconnect();
  client = null;
  configured.value = false;
  modelsLoading.value = false;
  model.value = '';
  models.value = [];
  if (keyInput.value) keyInput.value.value = '';
}

/** Use verified recent market data only after the user's Generate action and publish a review draft, never execution. */
async function generate(): Promise<void> {
  clock.value = Date.now();
  if (
    mode.value !== 'api' ||
    !client ||
    modelsLoading.value ||
    (provider.value !== 'custom' && !model.value) ||
    generating.value ||
    cooldown.value > 0 ||
    !instruction.value.trim()
  )
    return;
  invalidatePreview();
  const version = requestVersion;
  const connection = client;
  const controller = new AbortController();
  active = controller;
  const settings = { ...props.settings };
  let requestingProvider = false;
  try {
    const { bot, historySettings } = prepareComposerRequest(settings, props.assets, instruction.value);
    phase.value = 'history';
    const history = await props.loadHistory(bot, historySettings);
    if (version !== requestVersion || controller.signal.aborted) return;
    const candles = composerMarketTail(history);
    requestingProvider = true;
    phase.value = 'provider';
    nextRequestAt.value = Date.now() + 60_000;
    clock.value = Date.now();
    const result = await connection.suggest(bot, candles, controller.signal);
    if (version !== requestVersion || controller.signal.aborted) return;
    const reviewed = composeReviewedStrategy(
      t('bots.labAi.defaultName', {
        rule: t(result.strategy.kind === 'rules' ? 'bots.codex.rules' : `bots.labAi.${result.strategy.kind}`),
      }),
      result.strategy,
      bot,
      settings
    );
    draft.value = { ...reviewed.strategy };
    name.value = reviewed.name;
    previewBot.value = bot;
    previewSettings = settings;
    observationCount.value = candles.length;
    usage.value = { ...result.usage };
  } catch {
    if (version === requestVersion)
      error.value = requestingProvider ? 'bots.labAi.generationError' : 'bots.labAi.historyError';
  } finally {
    if (version === requestVersion) {
      phase.value = 'idle';
      active = null;
    }
  }
}

/** Validate edits again and emit a copied experiment definition only on explicit form submission. */
function apply(): void {
  if (props.busy || !draft.value || !previewBot.value || !previewSettings) return;
  try {
    const proposal = composeReviewedStrategy(name.value, draft.value, previewBot.value, previewSettings);
    error.value = '';
    emit('propose', proposal);
    draft.value = null;
    added.value = true;
  } catch {
    error.value = 'bots.labAi.reviewError';
  }
}

watch(
  () => JSON.stringify([props.settings, props.assets, props.selectedRules, props.selectedStrategy]),
  invalidatePreview,
  { flush: 'sync' }
);
watch(instruction, invalidatePreview, { flush: 'sync' });
watch(provider, disconnect, { flush: 'sync' });
watch(mode, disconnect, { flush: 'sync' });
watch(codexEnabled, invalidatePreview, { flush: 'sync' });
watch([mode, codexEnabled], syncCodexTools, { flush: 'sync' });
onMounted(() => {
  mounted = true;
  syncCodexTools();
  window.addEventListener('focus', refreshCodexSupport);
  document.addEventListener('visibilitychange', refreshCodexSupport);
  ticker = setInterval(() => {
    clock.value = Date.now();
    if (codexState.value === 'unavailable' && isCodexStrategySupported()) refreshCodexSupport();
  }, 1000);
});
onBeforeUnmount(() => {
  mounted = false;
  disconnect();
  syncCodexTools();
  window.removeEventListener('focus', refreshCodexSupport);
  document.removeEventListener('visibilitychange', refreshCodexSupport);
  if (ticker) clearInterval(ticker);
});
</script>

<style scoped lang="scss">
.strategy-composer {
  color: var(--lab-text, var(--s-color-base-content-primary));
  font-size: 13px;
  line-height: 1.5;
  padding: 22px;
  background: var(--lab-panel, var(--s-color-utility-surface));
  border: 1px solid var(--lab-line, var(--s-color-base-border-secondary));
  border-radius: 20px;
  box-shadow: var(--s-shadow-dialog);
  text-align: start;
}
.composer-heading,
.composer-connected,
.composer-models,
.composer-review-heading,
.composer-evidence {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.composer-models {
  margin: 14px 0;
  .composer-field {
    flex: 1;
    min-width: 0;
  }
}
.composer-heading h3 {
  margin: 3px 0 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.composer-state {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--lab-muted, var(--s-color-base-content-secondary));
  font-size: 10px;
  white-space: nowrap;
}
.composer-state i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.composer-state.configured {
  color: var(--lab-cyan, var(--s-color-status-success-text));
}
.composer-state.configured i {
  box-shadow: 0 0 8px color-mix(in srgb, currentColor 45%, transparent);
}
.composer-modes,
.composer-handoff {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 18px;
}
.composer-modes [aria-pressed='true'] {
  color: var(--lab-accent, var(--s-color-action-text));
  border-color: currentColor;
}
.composer-help {
  margin-top: 12px;
  color: var(--lab-muted, var(--s-color-base-content-secondary));
  font-size: 12px;
  line-height: 1.6;
  summary {
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid var(--s-color-focus-ring);
      outline-offset: 3px;
    }
  }
}
.composer-steps {
  padding-inline-start: 20px;
  margin: 0 0 16px;
}
.composer-steps li + li {
  margin-top: 8px;
}
.composer-handoff .composer-primary {
  width: auto;
  margin: 0;
  text-decoration: none;
}
.composer-import {
  display: grid;
  gap: 12px;
  margin: 16px 0;
}
.composer-copy-fallback textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
  font: inherit;
}
.composer-fields {
  display: grid;
  grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
  gap: 12px;
}
.composer-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.composer-field > span {
  font-size: 11px;
  color: var(--lab-muted, var(--s-color-base-content-secondary));
}
.composer-field input,
.composer-field select,
.composer-field textarea {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--lab-line, var(--s-color-base-border-secondary));
  background: var(--lab-bg, var(--s-color-base-background));
  color: var(--lab-text, var(--s-color-base-content-primary));
  font: inherit;
  font-variant-numeric: tabular-nums;
  border-radius: 16px;
  padding: 11px 14px;
  box-shadow: var(--s-shadow-element);
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
  &:focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 2px;
    border-color: var(--s-color-focus-ring);
    box-shadow: var(--s-shadow-element-pressed);
  }
  &::placeholder {
    color: var(--lab-muted, var(--s-color-base-content-secondary));
    opacity: 0.75;
  }
}
.composer-field textarea {
  resize: vertical;
  min-height: 88px;
}
.composer-prompt {
  margin-bottom: 16px;
}
.composer-connection > .composer-field {
  margin-top: 12px;
}
.composer-note {
  color: var(--lab-muted, var(--s-color-base-content-secondary));
  font-size: 11px;
  margin: 10px 0;
}
.composer-connected {
  margin: 14px 0;
  font:
    11px/1.5 ui-monospace,
    monospace;
}
.composer-connected small {
  color: var(--lab-muted, var(--s-color-base-content-secondary));
  overflow-wrap: anywhere;
}
.composer-primary,
.composer-secondary,
.composer-text-button {
  font: inherit;
  cursor: pointer;
  border-radius: 16px;
  transition:
    background-color 0.15s,
    box-shadow 0.15s,
    border-color 0.15s,
    transform 0.15s;
  &:focus-visible {
    outline: 2px solid var(--s-color-focus-ring);
    outline-offset: 3px;
  }
}
.composer-primary {
  width: 100%;
  padding: 11px 16px;
  margin-top: 12px;
  border: 1px solid var(--lab-line, var(--s-color-base-border-secondary));
  background: var(--lab-bg, var(--s-color-base-background));
  color: var(--lab-accent, var(--s-color-action-text));
  box-shadow: var(--s-shadow-element);
  font-weight: 650;
}
.composer-primary:hover:not(:disabled) {
  background: var(--s-color-base-background-hover);
  border-color: var(--lab-accent, var(--s-color-action-text));
  transform: translateY(-1px);
}
.composer-primary:active:not(:disabled),
.composer-secondary:active {
  box-shadow: var(--s-shadow-element-pressed);
  transform: translateY(1px);
}
.composer-primary:disabled {
  cursor: default;
  color: var(--s-color-on-action-disabled);
  background: var(--s-color-action-disabled-fill);
  box-shadow: var(--s-shadow-element);
}
.composer-secondary {
  text-decoration: none;
  padding: 11px 15px;
  background: var(--lab-bg, var(--s-color-base-background));
  border: 1px solid var(--lab-line, var(--s-color-base-border-secondary));
  color: var(--lab-text, var(--s-color-base-content-primary));
  box-shadow: var(--s-shadow-element);
}
.composer-secondary:hover {
  background: var(--s-color-base-background-hover);
  border-color: var(--lab-cyan, var(--s-color-status-success-text));
}
.composer-text-button {
  padding: 4px 0;
  border: 0;
  color: var(--lab-muted, var(--s-color-base-content-secondary));
  background: transparent;
  text-decoration: underline;
}
.composer-review {
  border-top: 1px solid var(--lab-line, var(--s-color-base-border-secondary));
  margin-top: 22px;
  padding-top: 18px;
  animation: composer-reveal 0.25s ease-out;
}
.composer-review-idea {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.composer-review h4 {
  margin: 0;
  font-size: 15px;
}
.composer-review-heading > span {
  color: var(--lab-cyan, var(--s-color-status-success-text));
  font:
    11px/1.5 ui-monospace,
    monospace;
}
.composer-name {
  grid-column: 1 / -1;
}
.composer-evidence {
  align-items: start;
  font:
    10px/1.6 ui-monospace,
    monospace;
  color: var(--lab-muted, var(--s-color-base-content-secondary));
  border-top: 1px solid var(--lab-line, var(--s-color-base-border-secondary));
  margin-top: 18px;
  padding-top: 12px;
}
.composer-error {
  color: var(--s-color-status-error-text);
  font-size: 12px;
  margin: 12px 0 0;
}
.composer-rule-behavior {
  color: var(--lab-cyan, var(--s-color-status-success-text));
  font-size: 12px;
  margin: 12px 0;
}
.composer-added {
  color: var(--lab-cyan, var(--s-color-status-success-text));
  margin: 12px 0 0;
}
.composer-scan {
  height: 4px;
  overflow: hidden;
  margin-top: 8px;
  border-radius: 16px;
  background: var(--lab-bg, var(--s-color-base-background));
  box-shadow: var(--s-shadow-element);
}
.composer-scan i {
  display: block;
  width: 30%;
  height: 100%;
  border-radius: inherit;
  background: var(--lab-cyan, var(--s-color-status-success-text));
  box-shadow: 0 0 12px color-mix(in srgb, var(--lab-cyan, var(--s-color-status-success-text)) 45%, transparent);
  animation: composer-scan 1.5s ease-in-out infinite;
}
@keyframes composer-scan {
  from {
    transform: translateX(-110%);
  }
  to {
    transform: translateX(440%);
  }
}
@keyframes composer-reveal {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .composer-scan i,
  .composer-review {
    animation: none;
  }
  .composer-primary {
    transition: none;
  }
}
@media (max-width: 420px) {
  .strategy-composer {
    padding: 16px;
  }
  .composer-heading {
    align-items: start;
  }
  .composer-fields {
    grid-template-columns: 1fr;
  }
}
</style>
