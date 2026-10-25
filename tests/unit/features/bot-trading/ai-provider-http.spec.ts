import { describe, expect, it } from 'vitest';
import {
  AI_MAX_OUTPUT_TOKENS,
  aiOutputTokens,
  classifyProviderFailure,
  claudeToolRequest,
  defaultAiModel,
  detectApiKeyProvider,
  isAiProviderFailure,
  isTimeoutSignal,
  openAiStrictSchema,
  providerErrorMessage,
  providerFetchError,
  providerStatusError,
} from '@/features/bot-trading/ai-provider-http';
import { DETERMINISTIC_STRATEGY_SCHEMA } from '@/features/bot-trading/ai';

const model = (id: string, createdAt = 0, maxOutputTokens?: number) => ({
  id,
  name: id,
  createdAt,
  ...(maxOutputTokens ? { maxOutputTokens } : {}),
});

describe('AI provider failures', () => {
  it('maps HTTP statuses to actionable app-owned keys without reading the body', () => {
    expect(providerStatusError(401)).toBe('bots.errors.aiKey');
    expect(providerStatusError(403)).toBe('bots.errors.aiAccess');
    expect(providerStatusError(404)).toBe('bots.errors.aiAccess');
    expect(providerStatusError(402)).toBe('bots.errors.aiQuota');
    expect(providerStatusError(429)).toBe('bots.errors.aiQuota');
    expect(providerStatusError(408)).toBe('bots.errors.aiBusy');
    expect(providerStatusError(500)).toBe('bots.errors.aiBusy');
    expect(providerStatusError(529)).toBe('bots.errors.aiBusy');
    expect(providerStatusError(400)).toBe('bots.errors.provider');
    expect(providerStatusError(422)).toBe('bots.errors.provider');
  });

  it('recognizes a low-credit 400 envelope and otherwise keeps the generic key', async () => {
    const credit = new Response(
      JSON.stringify({
        type: 'error',
        error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the API.' },
      }),
      { status: 400 }
    );
    expect(await classifyProviderFailure(credit)).toBe('bots.errors.aiQuota');
    const quota = new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: 'quota' } }), {
      status: 400,
    });
    expect(await classifyProviderFailure(quota)).toBe('bots.errors.aiQuota');
    const schema = new Response(JSON.stringify({ error: { type: 'invalid_request_error', message: 'bad schema' } }), {
      status: 400,
    });
    expect(await classifyProviderFailure(schema)).toBe('bots.errors.provider');
    expect(await classifyProviderFailure(new Response('not json '.repeat(2_000), { status: 400 }))).toBe(
      'bots.errors.provider'
    );
    expect(await classifyProviderFailure(new Response('sk-ant-secret credit balance', { status: 401 }))).toBe(
      'bots.errors.aiKey'
    );
  });

  it('separates timeouts, unreachable providers and other fetch failures', () => {
    expect(providerFetchError(new TypeError('Failed to fetch'), false)).toBe('bots.errors.aiNetwork');
    expect(providerFetchError(new DOMException('Aborted', 'AbortError'), true)).toBe('bots.errors.aiTimeout');
    expect(providerFetchError(new DOMException('Aborted', 'AbortError'), false)).toBe('bots.errors.provider');
    expect(isTimeoutSignal(AbortSignal.abort(new DOMException('late', 'TimeoutError')))).toBe(true);
    expect(isTimeoutSignal(AbortSignal.abort())).toBe(false);
    expect(isTimeoutSignal(new AbortController().signal)).toBe(false);
    expect(isTimeoutSignal()).toBe(false);
  });

  it('keeps only known specific keys from caught errors', () => {
    expect(isAiProviderFailure('bots.errors.aiQuota')).toBe(true);
    expect(isAiProviderFailure('bots.errors.provider')).toBe(false);
    expect(providerErrorMessage(new Error('bots.errors.aiNetwork'))).toBe('bots.errors.aiNetwork');
    expect(providerErrorMessage(new Error('sk-ant-leaked provider text'))).toBe('bots.errors.provider');
    expect(providerErrorMessage('bots.errors.aiKey')).toBe('bots.errors.provider');
  });
});

describe('AI provider connection helpers', () => {
  it('detects the provider from a pasted key prefix only', () => {
    expect(detectApiKeyProvider('  sk-ant-api03-abc ')).toBe('claude');
    expect(detectApiKeyProvider('sk-proj-abc')).toBe('openai');
    expect(detectApiKeyProvider('sk-abc')).toBe('openai');
    expect(detectApiKeyProvider('sk-')).toBeNull();
    expect(detectApiKeyProvider('jev-key')).toBeNull();
    expect(detectApiKeyProvider('')).toBeNull();
  });

  it('defaults to Claude Opus 5.5 and to the newest general OpenAI model', () => {
    expect(defaultAiModel([model('claude-fable-5-1', 3), model('claude-opus-5-5', 2)], 'claude')).toBe(
      'claude-opus-5-5'
    );
    expect(defaultAiModel([model('claude-sonnet-5-5', 2), model('claude-haiku-4-5', 1)], 'claude')).toBe(
      'claude-sonnet-5-5'
    );
    expect(
      defaultAiModel(
        [model('gpt-6-pro', 5), model('gpt-6-codex', 4), model('gpt-6-2026-09-01', 3), model('gpt-6', 2)],
        'openai'
      )
    ).toBe('gpt-6');
    expect(defaultAiModel([model('gpt-6-mini', 2), model('gpt-6-nano', 1)], 'openai')).toBe('gpt-6-mini');
    expect(defaultAiModel([], 'claude')).toBe('');
  });

  it('bounds the output budget by the catalog ceiling', () => {
    const catalog = [model('small', 0, 8_192), model('large', 0, 128_000)];
    expect(aiOutputTokens('small', catalog)).toBe(8_192);
    expect(aiOutputTokens('large', catalog)).toBe(AI_MAX_OUTPUT_TOKENS);
    expect(aiOutputTokens('unknown', catalog)).toBe(AI_MAX_OUTPUT_TOKENS);
  });

  it('requests exactly one Claude tool call without forced tool choice', () => {
    const body = claudeToolRequest({
      model: 'claude-opus-5-5',
      maxTokens: 16_000,
      system: 'Draft a rule.',
      input: '{"task":"strategy"}',
      tool: 'bot_decision',
      schema: { type: 'object' },
    });
    expect(body.tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    expect(body.system).toBe('Draft a rule. Respond only by calling the bot_decision tool exactly once.');
    expect(body.tools).toEqual([{ name: 'bot_decision', description: body.system, input_schema: { type: 'object' } }]);
    expect(body.messages).toEqual([{ role: 'user', content: '{"task":"strategy"}' }]);
    expect(body.max_tokens).toBe(16_000);
  });

  it('removes only string-length keywords for OpenAI strict schemas without mutating the source', () => {
    const before = JSON.stringify(DETERMINISTIC_STRATEGY_SCHEMA);
    const schema = openAiStrictSchema(DETERMINISTIC_STRATEGY_SCHEMA);
    const text = JSON.stringify(schema);
    expect(text).not.toMatch(/maxLength|minLength/);
    expect(text).toContain('"minimum":6000');
    expect(text).toContain('"maxItems":4');
    expect(JSON.stringify(DETERMINISTIC_STRATEGY_SCHEMA)).toBe(before);
    expect(schema.required).toEqual(DETERMINISTIC_STRATEGY_SCHEMA.required);
  });
});
