import type { BotAiModel } from './ai-models';

/**
 * Shared request and failure handling for the direct Claude and OpenAI API connections.
 *
 * Every failure becomes an app-owned `bots.errors.*` key with a translated, actionable message. Provider
 * response bodies, keys and raw exceptions never reach the page.
 */

/** Specific, user-actionable API connection failures. */
export const AI_PROVIDER_FAILURES = [
  'bots.errors.aiKeyMissing',
  'bots.errors.aiKey',
  'bots.errors.aiAccess',
  'bots.errors.aiQuota',
  'bots.errors.aiBusy',
  'bots.errors.aiNetwork',
  'bots.errors.aiTimeout',
] as const;
export type AiProviderFailure = (typeof AI_PROVIDER_FAILURES)[number];
/** A specific failure, or the generic key for unusable responses. */
export type AiProviderError = AiProviderFailure | 'bots.errors.provider';

/** Output budget for one typed draft. Current Claude and OpenAI models reason first and count it here. */
export const AI_MAX_OUTPUT_TOKENS = 16_000;
/** Reasoning models can take well over 30 seconds for one draft; a later abort is still bounded. */
export const AI_REQUEST_TIMEOUT_MS = 120_000;
/** Claude's recommended default model, used when the account catalog lists it. */
export const PREFERRED_CLAUDE_MODEL = 'claude-opus-5-5';

const MAX_ERROR_BYTES = 4_096;
const LOW_CREDIT = /credit balance|billing|insufficient_quota|exceeded your current quota/i;
const SPECIALIZED_OPENAI_MODEL =
  /(?:^|-)(?:pro|codex|chat|mini|nano|search|preview|audio|realtime|transcribe|tts|image|instant)(?:-|$)|-\d{4}-\d{2}-\d{2}$/;

/** True for a specific failure key, which callers may show instead of the generic provider error. */
export function isAiProviderFailure(value: unknown): value is AiProviderFailure {
  return typeof value === 'string' && (AI_PROVIDER_FAILURES as readonly string[]).includes(value);
}

/** Keep a specific failure from a caught error and collapse anything else to the generic provider key. */
export function providerErrorMessage(failure: unknown): AiProviderError {
  const message = failure instanceof Error ? failure.message : '';
  return isAiProviderFailure(message) ? message : 'bots.errors.provider';
}

/** Classify an HTTP status without reading the response body. */
export function providerStatusError(status: number): AiProviderError {
  if (status === 401) return 'bots.errors.aiKey';
  if (status === 403 || status === 404) return 'bots.errors.aiAccess';
  if (status === 402 || status === 429) return 'bots.errors.aiQuota';
  if (status === 408 || (status >= 500 && status <= 599)) return 'bots.errors.aiBusy';
  return 'bots.errors.provider';
}

/**
 * Classify a failed response. Anthropic reports an empty credit balance as HTTP 400, so only a 400 body is
 * inspected: at most 4 KiB is matched once for a billing phrase and then discarded, never shown or stored.
 */
export async function classifyProviderFailure(response: Response): Promise<AiProviderError> {
  const status = providerStatusError(response.status);
  if (response.status !== 400 || !response.body) return status;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  try {
    while (text.length < MAX_ERROR_BYTES) {
      const chunk = await reader.read();
      if (chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
    }
    const parsed: unknown = JSON.parse(text.slice(0, MAX_ERROR_BYTES));
    const detail = parsed && typeof parsed === 'object' ? (parsed as { error?: unknown }).error : undefined;
    const fields =
      detail && typeof detail === 'object'
        ? ['type', 'code', 'message'].map((key) => (detail as Record<string, unknown>)[key])
        : [];
    return fields.some((field) => typeof field === 'string' && LOW_CREDIT.test(field)) ? 'bots.errors.aiQuota' : status;
  } catch {
    return status;
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

/** Translate a rejected fetch: this client's own timeout, or a provider the browser could not reach. */
export function providerFetchError(failure: unknown, timedOut: boolean): AiProviderError {
  if (timedOut) return 'bots.errors.aiTimeout';
  return failure instanceof TypeError ? 'bots.errors.aiNetwork' : 'bots.errors.provider';
}

/** Treat an aborted caller signal with a timeout reason like this client's own timeout. */
export function isTimeoutSignal(signal?: AbortSignal): boolean {
  return !!signal?.aborted && signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError';
}

/** Recognize the public prefix of a pasted API key. The key itself is never retained. */
export function detectApiKeyProvider(key: string): 'claude' | 'openai' | null {
  const value = key.trim();
  if (value.startsWith('sk-ant-')) return 'claude';
  return /^sk-[A-Za-z0-9_-]/.test(value) ? 'openai' : null;
}

/** Default to Claude Opus 5.5, or OpenAI's newest general model, from a newest-first account catalog. */
export function defaultAiModel(models: readonly BotAiModel[], provider: 'openai' | 'claude'): string {
  const preferred =
    provider === 'claude'
      ? models.find((entry) => entry.id === PREFERRED_CLAUDE_MODEL)
      : models.find((entry) => !SPECIALIZED_OPENAI_MODEL.test(entry.id));
  return (preferred ?? models[0])?.id ?? '';
}

/** Bound the output budget by the selected model's advertised ceiling when the catalog provides one. */
export function aiOutputTokens(model: string, catalog: readonly BotAiModel[]): number {
  const limit = catalog.find((entry) => entry.id === model)?.maxOutputTokens;
  return limit ? Math.min(AI_MAX_OUTPUT_TOKENS, limit) : AI_MAX_OUTPUT_TOKENS;
}

/**
 * Claude Messages body for exactly one typed tool call. Current models (Opus 5.5, Sonnet 5.5, Fable 5.1) reject a
 * forced `tool_choice`, so the call is requested with `auto` plus an instruction and the output is validated locally.
 */
export function claudeToolRequest(options: {
  model: string;
  maxTokens: number;
  system: string;
  input: string;
  tool: string;
  schema: object;
}) {
  const system = `${options.system} Respond only by calling the ${options.tool} tool exactly once.`;
  return {
    model: options.model,
    max_tokens: options.maxTokens,
    system,
    messages: [{ role: 'user', content: options.input }],
    tools: [{ name: options.tool, description: system, input_schema: options.schema }],
    tool_choice: { type: 'auto', disable_parallel_tool_use: true },
  };
}

/** Copy a JSON schema without string-length keywords that OpenAI strict outputs reject; local parsers enforce them. */
export function openAiStrictSchema<T>(schema: T): T {
  if (Array.isArray(schema)) return schema.map((item) => openAiStrictSchema(item)) as T;
  if (!schema || typeof schema !== 'object') return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== 'minLength' && key !== 'maxLength')
      .map(([key, value]) => [key, openAiStrictSchema(value)])
  ) as T;
}
