import { codec, fromCodec, toCodec } from './amounts';
import { DETERMINISTIC_STRATEGY_INSTRUCTIONS, DETERMINISTIC_STRATEGY_SCHEMA, validateBotEndpoint } from './ai';
import { parseBotAiModels, type BotAiModel } from './ai-models';
import {
  AI_REQUEST_TIMEOUT_MS,
  aiOutputTokens,
  classifyProviderFailure,
  claudeToolRequest,
  isTimeoutSignal,
  openAiStrictSchema,
  providerErrorMessage,
  providerFetchError,
} from './ai-provider-http';
import { parseBotPrice } from './engine';
import { JEV_ENDPOINT, JEV_MODEL, JEV_STRATEGY_CRITERIA } from './jev';
import { createLocalCodexCompanion } from './local-codex-companion';
import type { BotAsset, BotCandle } from './types';

/** All providers receive the same copied, training-only discovery data. */
export interface DiscoveryDraftContext {
  requestId: string;
  idea: string;
  pair: { assetIn: BotAsset; assetOut: BotAsset };
  training: { from: number; to: number; candles: BotCandle[] };
  constraints: {
    capital: string;
    maxTradeCodec: string;
    /** Input-token notional used for the dated current-state fee and impact scenario. */
    feeSampleAmount: string;
    minimumIntervalMs: number;
    maximumIntervalMs: number;
    slippagePercent: string;
    feeBudgetXor: string;
    networkFeeXor: string;
    swapFeePercent: string;
    sellNetworkFeeXor: string;
    sellSwapFeePercent: string;
    priceImpactPercent: string;
    sellPriceImpactPercent: string;
  };
  priorResults?: Array<{
    returnPercent: string;
    excessReturnPercent: string | null;
    drawdownPercent: string;
    trades: number;
  }>;
  /** Separately consented aggregate from a new, explicitly exploratory research session. */
  liveFeedback?: {
    windowState: 'exploratory';
    activeHours: number;
    successfulSwaps: number;
    netReturnPercent: string;
    excessReturnPercent: string;
    drawdownPercent: string;
    feesPaidXor: string;
  };
}

export type DiscoveryProviderKind = 'openai' | 'claude' | 'jev' | 'custom' | 'codex' | 'claude-code';
export interface DiscoveryProviderConnection {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}
export interface DiscoveryProvider {
  /** Only local CLI providers use pairing; API providers reject this call. */
  pair(code: string, signal: AbortSignal): Promise<void>;
  /** One charged/dispatched round. The caller owns call caps and the durable checkpoint. */
  suggest(context: DiscoveryDraftContext, signal?: AbortSignal): Promise<{ requestId: string; strategy: unknown }>;
  /** API model metadata, when the provider exposes a catalog. */
  listModels(signal?: AbortSignal): Promise<BotAiModel[]>;
  selectModel(model: string): void;
  disconnect(): void;
}

/** Version 2 custom HTTPS discovery protocol; version 1 trade and composer endpoints remain unchanged. */
export interface DiscoveryProviderRequest {
  version: 2;
  task: 'discovery';
  context: DiscoveryDraftContext;
  responseSchema: typeof DISCOVERY_DRAFT_SCHEMA;
}
export interface DiscoveryProviderResponse {
  version: 2;
  requestId: string;
  strategy: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECIMAL = /^(?:0|[1-9]\d{0,23})(?:\.\d{1,40})?$/;
const SIGNED_DECIMAL = /^-?(?:0|[1-9]\d{0,23})(?:\.\d{1,40})?$/;
const CODEC = /^(?:0|[1-9]\d{0,79})$/;
const HOUR_MS = 3_600_000;
const MAX_RESPONSE_BYTES = 32_768;
const MAX_REQUEST_BYTES = 65_536;
const error = () => new Error('bots.errors.provider');

/** Strict shape also binds the model output to a particular research request. */
export const DISCOVERY_STRATEGY_SCHEMA = {
  ...DETERMINISTIC_STRATEGY_SCHEMA,
  properties: {
    ...DETERMINISTIC_STRATEGY_SCHEMA.properties,
    signalTiming: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['closed-hour'] }] },
  },
} as const;

export const DISCOVERY_DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    requestId: { type: 'string' },
    strategy: DISCOVERY_STRATEGY_SCHEMA,
  },
  required: ['requestId', 'strategy'],
} as const;

function record(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw error();
  const fields = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(fields).some((key) => typeof key !== 'string' || !('value' in fields[key])) ||
    required.some((key) => !Object.hasOwn(fields, key)) ||
    Object.keys(fields).some((key) => !required.includes(key) && !optional.includes(key))
  )
    throw error();
  return value as Record<string, unknown>;
}

function decimal(value: unknown, signed = false): string {
  if (typeof value !== 'string' || !(signed ? SIGNED_DECIMAL : DECIMAL).test(value)) throw error();
  return value;
}

function asset(value: unknown): BotAsset {
  const item = record(value, ['address', 'symbol', 'decimals']);
  if (
    typeof item.address !== 'string' ||
    !/^[A-Za-z0-9:_-]{1,256}$/.test(item.address) ||
    typeof item.symbol !== 'string' ||
    !/^[^\u0000-\u001f\u007f]{1,32}$/.test(item.symbol) ||
    !Number.isInteger(item.decimals) ||
    (item.decimals as number) < 0 ||
    (item.decimals as number) > 36
  )
    throw error();
  return { address: item.address, symbol: item.symbol, decimals: item.decimals as number };
}

/** Reject extra fields (including holdout, account and wallet fields) before copying provider input. */
export function copyDiscoveryDraftContext(value: unknown, now = Date.now()): DiscoveryDraftContext {
  const source = record(
    value,
    ['requestId', 'idea', 'pair', 'training', 'constraints'],
    ['priorResults', 'liveFeedback']
  );
  if (!UUID.test(String(source.requestId)) || typeof source.idea !== 'string' || source.idea.length > 2_000)
    throw error();
  const pair = record(source.pair, ['assetIn', 'assetOut']);
  const assetIn = asset(pair.assetIn);
  const assetOut = asset(pair.assetOut);
  if (assetIn.address === assetOut.address) throw error();
  const training = record(source.training, ['from', 'to', 'candles']);
  if (
    !Number.isSafeInteger(training.from) ||
    !Number.isSafeInteger(training.to) ||
    (training.from as number) < 0 ||
    (training.to as number) <= (training.from as number) ||
    (training.to as number) > now ||
    !Array.isArray(training.candles) ||
    training.candles.length < 20 ||
    training.candles.length > 202
  )
    throw error();
  const inputCandles = training.candles as BotCandle[];
  const candles = inputCandles.map((value, index) => {
    const candle = record(value, ['timestamp', 'close'], ['feeClose']);
    if (
      !Number.isSafeInteger(candle.timestamp) ||
      (candle.timestamp as number) < (training.from as number) ||
      (candle.timestamp as number) > (training.to as number) ||
      (index > 0 && (candle.timestamp as number) <= inputCandles[index - 1].timestamp)
    )
      throw error();
    parseBotPrice(candle.close as string);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose as string);
    return {
      timestamp: candle.timestamp as number,
      close: candle.close as string,
      ...(candle.feeClose === undefined ? {} : { feeClose: candle.feeClose as string }),
    };
  });
  const limits = record(source.constraints, [
    'capital',
    'maxTradeCodec',
    'feeSampleAmount',
    'minimumIntervalMs',
    'maximumIntervalMs',
    'slippagePercent',
    'feeBudgetXor',
    'networkFeeXor',
    'swapFeePercent',
    'sellNetworkFeeXor',
    'sellSwapFeePercent',
    'priceImpactPercent',
    'sellPriceImpactPercent',
  ]);
  if (
    typeof limits.maxTradeCodec !== 'string' ||
    !CODEC.test(limits.maxTradeCodec) ||
    codec(limits.maxTradeCodec) === 0n ||
    !Number.isSafeInteger(limits.minimumIntervalMs) ||
    !Number.isSafeInteger(limits.maximumIntervalMs) ||
    (limits.minimumIntervalMs as number) < HOUR_MS ||
    (limits.maximumIntervalMs as number) > 2_592_000_000 ||
    (limits.minimumIntervalMs as number) > (limits.maximumIntervalMs as number)
  )
    throw error();
  const copiedConstraints = {
    capital: decimal(limits.capital),
    maxTradeCodec: limits.maxTradeCodec,
    feeSampleAmount: decimal(limits.feeSampleAmount),
    minimumIntervalMs: limits.minimumIntervalMs as number,
    maximumIntervalMs: limits.maximumIntervalMs as number,
    slippagePercent: decimal(limits.slippagePercent),
    feeBudgetXor: decimal(limits.feeBudgetXor),
    networkFeeXor: decimal(limits.networkFeeXor),
    swapFeePercent: decimal(limits.swapFeePercent),
    sellNetworkFeeXor: decimal(limits.sellNetworkFeeXor),
    sellSwapFeePercent: decimal(limits.sellSwapFeePercent),
    priceImpactPercent: decimal(limits.priceImpactPercent),
    sellPriceImpactPercent: decimal(limits.sellPriceImpactPercent),
  };
  const capitalCodec = codec(toCodec(copiedConstraints.capital, assetIn.decimals));
  const feeSampleCodec = codec(toCodec(copiedConstraints.feeSampleAmount, assetIn.decimals));
  if (capitalCodec === 0n || feeSampleCodec === 0n || feeSampleCodec > capitalCodec) throw error();
  let priorResults: DiscoveryDraftContext['priorResults'];
  if (source.priorResults !== undefined) {
    if (!Array.isArray(source.priorResults) || source.priorResults.length > 8) throw error();
    priorResults = source.priorResults.map((value) => {
      const item = record(value, ['returnPercent', 'excessReturnPercent', 'drawdownPercent', 'trades']);
      if (!Number.isSafeInteger(item.trades) || (item.trades as number) < 0) throw error();
      return {
        returnPercent: decimal(item.returnPercent, true),
        excessReturnPercent: item.excessReturnPercent === null ? null : decimal(item.excessReturnPercent, true),
        drawdownPercent: decimal(item.drawdownPercent),
        trades: item.trades as number,
      };
    });
  }
  let liveFeedback: DiscoveryDraftContext['liveFeedback'];
  if (source.liveFeedback !== undefined) {
    const feedback = record(source.liveFeedback, [
      'windowState',
      'activeHours',
      'successfulSwaps',
      'netReturnPercent',
      'excessReturnPercent',
      'drawdownPercent',
      'feesPaidXor',
    ]);
    if (
      feedback.windowState !== 'exploratory' ||
      !Number.isSafeInteger(feedback.activeHours) ||
      (feedback.activeHours as number) < 0 ||
      !Number.isSafeInteger(feedback.successfulSwaps) ||
      (feedback.successfulSwaps as number) < 0
    )
      throw error();
    liveFeedback = {
      windowState: 'exploratory',
      activeHours: feedback.activeHours as number,
      successfulSwaps: feedback.successfulSwaps as number,
      netReturnPercent: decimal(feedback.netReturnPercent, true),
      excessReturnPercent: decimal(feedback.excessReturnPercent, true),
      drawdownPercent: decimal(feedback.drawdownPercent),
      feesPaidXor: decimal(feedback.feesPaidXor),
    };
  }
  const result: DiscoveryDraftContext = {
    requestId: source.requestId as string,
    idea: source.idea,
    pair: { assetIn, assetOut },
    training: { from: training.from as number, to: training.to as number, candles },
    constraints: copiedConstraints,
    ...(priorResults ? { priorResults } : {}),
    ...(liveFeedback ? { liveFeedback } : {}),
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_REQUEST_BYTES) throw error();
  return result;
}

/** A response may contain only one typed draft bound to its request ID. */
export function parseDiscoveryDraft(value: unknown, requestId: string): { requestId: string; strategy: unknown } {
  const draft = record(value, ['requestId', 'strategy']);
  if (draft.requestId !== requestId) throw error();
  const strategy = record(draft.strategy, [
    'kind',
    'amount',
    'intervalMs',
    'threshold',
    'direction',
    'fastWindow',
    'slowWindow',
    'prompt',
    'rules',
    'signalTiming',
  ]);
  if (strategy.kind === 'sma' ? strategy.signalTiming !== 'closed-hour' : strategy.signalTiming !== null) throw error();
  return { requestId, strategy: draft.strategy };
}

/** Bound response bytes before parsing; failures map to app-owned keys and never expose provider error bodies. */
async function readJson(response: Response, maxBytes = MAX_RESPONSE_BYTES): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error(await classifyProviderFailure(response));
  if (!response.body) throw error();
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let raw = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw error();
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
    const parsed: unknown = JSON.parse(raw);
    return record(parsed, [], Object.keys(parsed as object));
  } catch {
    throw error();
  } finally {
    reader.releaseLock();
  }
}

/** Prefer a small fixed Jev recipe set; Jev cannot author arbitrary execution rules. */
function jevRequest(context: DiscoveryDraftContext) {
  const available = {
    ...(context.constraints.minimumIntervalMs <= 86_400_000 && context.constraints.maximumIntervalMs >= 86_400_000
      ? { dca_daily: JEV_STRATEGY_CRITERIA.dca_daily }
      : {}),
    ...(context.constraints.minimumIntervalMs <= HOUR_MS &&
    context.constraints.maximumIntervalMs >= HOUR_MS &&
    context.training.candles.length >= 21
      ? { sma_5_20: JEV_STRATEGY_CRITERIA.sma_5_20 }
      : {}),
    ...(context.constraints.minimumIntervalMs <= HOUR_MS &&
    context.constraints.maximumIntervalMs >= HOUR_MS &&
    context.training.candles.length >= 49
      ? { sma_12_48: JEV_STRATEGY_CRITERIA.sma_12_48 }
      : {}),
  };
  if (!Object.keys(available).length) throw error();
  return {
    body: {
      model: JEV_MODEL,
      state: JSON.stringify({ version: 2, task: 'discovery', dataScope: 'training-only', context, recipes: available }),
      questions: {
        strategy: {
          type: 'choice',
          instructions:
            'Select one supplied strategy for local training evaluation. Costs are a dated current-state scenario at feeSampleAmount, and the site re-quotes each actual draft size. Do not invent a strategy or claim future profit.',
          criteria: available,
        },
      },
    },
    choices: Object.keys(available),
  };
}

/** Convert a confident Jev choice into a fixed deterministic draft using exact codec sizing. */
function jevDraft(data: Record<string, unknown>, context: DiscoveryDraftContext, choices: string[]) {
  const answers = record(data.answers, ['strategy']);
  const answer = record(answers.strategy, ['type', 'choice', 'confidence', 'probabilities']);
  const probabilities = record(answer.probabilities, choices);
  if (
    answer.type !== 'choice' ||
    typeof answer.choice !== 'string' ||
    !choices.includes(answer.choice) ||
    typeof answer.confidence !== 'number' ||
    !Number.isFinite(answer.confidence) ||
    answer.confidence < 0.8 ||
    answer.confidence > 1 ||
    !choices.every(
      (choice) =>
        typeof probabilities[choice] === 'number' &&
        (probabilities[choice] as number) >= 0 &&
        (probabilities[choice] as number) <= 1
    ) ||
    (probabilities[answer.choice] as number) < 0.8 ||
    Math.abs(choices.reduce((sum, choice) => sum + (probabilities[choice] as number), 0) - 1) > 0.000001 ||
    choices.some((choice) => (probabilities[choice] as number) > (probabilities[answer.choice as string] as number))
  )
    throw error();
  const capitalCodec = codec(toCodec(context.constraints.capital, context.pair.assetIn.decimals));
  const orderCodec =
    capitalCodec / 10n < codec(context.constraints.maxTradeCodec)
      ? capitalCodec / 10n
      : codec(context.constraints.maxTradeCodec);
  if (orderCodec === 0n) throw error();
  const choice = answer.choice;
  const slowWindow = choice === 'sma_12_48' ? 48 : 20;
  const strategy = {
    kind: choice === 'dca_daily' ? 'dca' : 'sma',
    amount: fromCodec(orderCodec.toString(), context.pair.assetIn.decimals),
    intervalMs: choice === 'dca_daily' ? 86_400_000 : HOUR_MS,
    threshold: '0',
    direction: 'below',
    fastWindow: choice === 'sma_12_48' ? 12 : 5,
    slowWindow,
    prompt: '',
    signalTiming: choice === 'dca_daily' ? null : 'closed-hour',
    rules: null,
  };
  return { requestId: context.requestId, strategy };
}

/** API and paired CLI adapters share one one-draft-per-round interface. */
export function createDiscoveryProvider(
  kind: DiscoveryProviderKind,
  supplied: DiscoveryProviderConnection = {},
  options: { request?: typeof fetch; now?: () => number } = {}
): DiscoveryProvider {
  if (!['openai', 'claude', 'jev', 'custom', 'codex', 'claude-code'].includes(kind)) throw error();
  const local = kind === 'codex' || kind === 'claude-code';
  let key = (supplied.apiKey ?? '').trim();
  let model = kind === 'jev' ? JEV_MODEL : (supplied.model ?? '').trim();
  const endpoint =
    kind === 'openai'
      ? 'https://api.openai.com/v1/responses'
      : kind === 'claude'
        ? 'https://api.anthropic.com/v1/messages'
        : kind === 'jev'
          ? supplied.endpoint?.trim()
            ? validateBotEndpoint(supplied.endpoint.trim())
            : JEV_ENDPOINT
          : kind === 'custom'
            ? validateBotEndpoint(supplied.endpoint ?? '')
            : '';
  if (!local && kind !== 'custom' && !key) throw new Error('bots.errors.aiKeyMissing');
  if (
    key.length > 1024 ||
    (!local && kind !== 'custom' && kind !== 'jev' && model !== '' && !/^[a-zA-Z0-9._:/-]{1,120}$/.test(model)) ||
    (kind === 'jev' && supplied.model && supplied.model !== JEV_MODEL)
  )
    throw error();
  const request = options.request ?? fetch;
  const now = options.now ?? Date.now;
  const companion = local ? createLocalCodexCompanion() : null;
  let disconnected = false;
  let pending: AbortController | null = null;
  let catalogRequest: AbortController | null = null;
  let lastRequest = -Infinity;
  let catalog: BotAiModel[] = [];
  return {
    async pair(code, signal) {
      if (!companion || disconnected) throw error();
      await companion.pair(code, signal);
    },
    async suggest(input, signal) {
      if (
        disconnected ||
        pending ||
        now() - lastRequest < 60_000 ||
        signal?.aborted ||
        ((kind === 'openai' || kind === 'claude') && !model)
      )
        throw error();
      const context = copyDiscoveryDraftContext(input, now());
      const controller = new AbortController();
      pending = controller;
      lastRequest = now();
      let timedOut = false;
      const abort = () => {
        timedOut ||= isTimeoutSignal(signal);
        controller.abort();
      };
      signal?.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(
        () => {
          timedOut = true;
          controller.abort();
        },
        local || kind === 'custom' ? 245_000 : AI_REQUEST_TIMEOUT_MS
      );
      try {
        if (local) {
          const result = await companion!.discoveryDraft(context, kind as 'codex' | 'claude-code', controller.signal);
          if (controller.signal.aborted || disconnected) throw error();
          return parseDiscoveryDraft(result, context.requestId);
        }
        const system = `${DETERMINISTIC_STRATEGY_INSTRUCTIONS} This is an automatic discovery round. Evaluate only the supplied completed-hour TRAINING data; holdout data and wallet state are absent. The fees and price impacts are a dated current-state scenario quoted for feeSampleAmount input tokens, not historical costs or a quote for your proposed order size. The site re-quotes the exact draft notional before research. SMA timing must be closed-hour, never live-price. Return the requestId unchanged alongside one strategy. Do not claim a guaranteed return.`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let body: unknown;
        let choices: string[] = [];
        if (kind === 'openai') {
          headers.Authorization = `Bearer ${key}`;
          body = {
            model,
            store: false,
            instructions: system,
            input: JSON.stringify(context),
            max_output_tokens: aiOutputTokens(model, catalog),
            text: {
              format: {
                type: 'json_schema',
                name: 'discovery_draft',
                strict: true,
                schema: openAiStrictSchema(DISCOVERY_DRAFT_SCHEMA),
              },
            },
          };
        } else if (kind === 'claude') {
          headers['x-api-key'] = key;
          headers['anthropic-version'] = '2023-06-01';
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          body = claudeToolRequest({
            model,
            maxTokens: aiOutputTokens(model, catalog),
            system,
            input: JSON.stringify(context),
            tool: 'discovery_draft',
            schema: DISCOVERY_DRAFT_SCHEMA,
          });
        } else if (kind === 'jev') {
          headers.Authorization = `Bearer ${key}`;
          const jev = jevRequest(context);
          body = jev.body;
          choices = jev.choices;
        } else {
          if (key) headers.Authorization = `Bearer ${key}`;
          body = {
            version: 2,
            task: 'discovery',
            context,
            responseSchema: DISCOVERY_DRAFT_SCHEMA,
          } satisfies DiscoveryProviderRequest;
        }
        if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_REQUEST_BYTES) throw error();
        const data = await readJson(
          await request(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
            redirect: 'error',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
          }).catch((failure: unknown) => {
            throw new Error(providerFetchError(failure, timedOut));
          })
        );
        if (controller.signal.aborted || disconnected) throw error();
        if (kind === 'jev') return jevDraft(data, context, choices);
        let result: unknown;
        if (kind === 'openai') {
          const output = data.output as Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
          const raw = output
            ?.filter((item) => item.type === 'message')
            .flatMap((item) => item.content ?? [])
            .filter((item) => item.type === 'output_text')
            .map((item) => item.text ?? '')
            .join('');
          result = JSON.parse(raw);
        } else if (kind === 'claude') {
          const content = data.content as Array<{ type?: string; name?: string; input?: unknown }>;
          const drafts = content?.filter((item) => item.type === 'tool_use' && item.name === 'discovery_draft');
          if (drafts?.length !== 1) throw error();
          result = drafts[0].input;
        } else {
          if (data.version !== 2) throw error();
          record(data, ['version', 'requestId', 'strategy'], ['usage']);
          result = { requestId: data.requestId, strategy: data.strategy };
        }
        return parseDiscoveryDraft(result, context.requestId);
      } catch (failure) {
        throw new Error(timedOut ? 'bots.errors.aiTimeout' : providerErrorMessage(failure));
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        pending = null;
      }
    },
    async listModels(signal) {
      if (disconnected || catalogRequest || !['openai', 'claude'].includes(kind)) throw error();
      const controller = new AbortController();
      catalogRequest = controller;
      let timedOut = false;
      const abort = () => {
        timedOut ||= isTimeoutSignal(signal);
        controller.abort();
      };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15_000);
      try {
        const headers: Record<string, string> =
          kind === 'openai'
            ? { Authorization: `Bearer ${key}` }
            : {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
              };
        const entries: BotAiModel[] = [];
        let after = '';
        for (let page = 0; page < 10; page++) {
          const url =
            kind === 'openai'
              ? 'https://api.openai.com/v1/models'
              : `https://api.anthropic.com/v1/models?limit=100${after ? `&after_id=${encodeURIComponent(after)}` : ''}`;
          const data = await readJson(
            await request(url, {
              method: 'GET',
              headers,
              signal: controller.signal,
              redirect: 'error',
              credentials: 'omit',
              referrerPolicy: 'no-referrer',
            }).catch((failure: unknown) => {
              throw new Error(providerFetchError(failure, timedOut));
            }),
            1_048_576
          );
          if (disconnected || controller.signal.aborted) throw error();
          entries.push(...parseBotAiModels(data, kind as 'openai' | 'claude'));
          if (kind === 'openai' || data.has_more !== true) break;
          if (
            typeof data.last_id !== 'string' ||
            !/^[a-zA-Z0-9._:/-]{1,120}$/.test(data.last_id) ||
            data.last_id === after
          )
            throw error();
          after = data.last_id;
          if (page === 9) throw error();
        }
        catalog = [...new Map(entries.map((item) => [item.id, item])).values()].sort(
          (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)
        );
        if (!catalog.length) throw error();
        return catalog.map((item) => ({ ...item }));
      } catch (failure) {
        throw new Error(timedOut ? 'bots.errors.aiTimeout' : providerErrorMessage(failure));
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        if (catalogRequest === controller) catalogRequest = null;
      }
    },
    selectModel(value) {
      if (disconnected || pending || !catalog.some((item) => item.id === value)) throw error();
      model = value;
    },
    disconnect() {
      disconnected = true;
      key = '';
      pending?.abort();
      catalogRequest?.abort();
      companion?.disconnect();
      catalog = [];
    },
  };
}
