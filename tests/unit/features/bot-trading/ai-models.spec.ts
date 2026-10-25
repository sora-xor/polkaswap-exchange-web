import { describe, expect, it, vi } from 'vitest';
import { parseBotAiModels } from '@/features/bot-trading/ai-models';
import { createBotAiClient, parseDeterministicStrategy } from '@/features/bot-trading/ai';
import { botFixture } from './fixtures';

describe('current provider model discovery', () => {
  it('keeps provider-listed text models, deduplicates and orders newest first', () => {
    const result = parseBotAiModels(
      {
        data: [
          { id: 'gpt-5-mini', created: 100 },
          { id: 'gpt-6', created: 200 },
          { id: 'gpt-5-mini', created: 100 },
          { id: 'gpt-image-1' },
          { id: 'gpt-5-realtime' },
          { id: 'gpt-4o-mini-tts' },
          { id: 'gpt-5-deep-research' },
          { id: '<script>' },
          { id: 'whisper-1' },
          null,
        ],
      },
      'openai'
    );
    expect(result.map((model) => model.id)).toEqual(['gpt-6', 'gpt-5-mini']);
    expect(() => parseBotAiModels({}, 'openai')).toThrow('bots.labAi.modelsUnavailable');
    expect(
      parseBotAiModels(
        { data: [{ id: 'claude-new', display_name: 'Claude\u0000 New', created_at: '2026-09-14' }] },
        'claude'
      )[0].name
    ).toBe('Claude New');
    expect(
      parseBotAiModels(
        {
          data: [
            { id: 'claude-capped', created_at: '2026-09-14', max_tokens: 8192 },
            { id: 'claude-unknown', created_at: '2026-09-13', max_tokens: '8192' },
          ],
        },
        'claude'
      ).map((model) => model.maxOutputTokens)
    ).toEqual([8192, undefined]);
    expect(parseBotAiModels({ data: [{ id: 'gpt-6', created: 1, max_tokens: 10 }] }, 'openai')[0]).not.toHaveProperty(
      'maxOutputTokens'
    );
  });

  it('loads the account catalog and uses the selected model for generation without exposing the key', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'gpt-6', created: 200 }] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  { type: 'output_text', text: JSON.stringify({ action: 'hold', amount: '0', reason: 'wait' }) },
                ],
              },
            ],
          })
        )
      );
    const client = createBotAiClient('openai', { apiKey: 'secret-test', model: '', endpoint: '' }, request, () => 1000);
    expect(() => client.selectModel('gpt-6')).toThrow('bots.errors.model');
    const models = await client.listModels();
    models[0].id = 'tampered';
    client.selectModel('gpt-6');
    expect(() => client.selectModel('tampered')).toThrow('bots.errors.model');
    await client.propose(botFixture(), [{ timestamp: 1000, close: '2' }]);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/models');
    expect(options).toMatchObject({
      method: 'GET',
      redirect: 'error',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Authorization: 'Bearer secret-test' },
    });
    expect(JSON.stringify(models)).not.toContain('secret-test');
    expect(JSON.parse(String(request.mock.calls[1][1]?.body)).model).toBe('gpt-6');
    client.disconnect();
    await expect(client.listModels()).rejects.toThrow('bots.labAi.modelsUnavailable');
  });

  it('follows bounded Claude pagination and preserves display names', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 'claude-new', display_name: 'Claude New', created_at: '2026-09-14' }],
            has_more: true,
            last_id: 'claude-new',
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'claude-old', created_at: '2026-08-14' }], has_more: false }))
      );
    const client = createBotAiClient('claude', { apiKey: 'key', model: '', endpoint: '' }, request);
    expect((await client.listModels()).map((model) => model.id)).toEqual(['claude-new', 'claude-old']);
    expect(request.mock.calls[1][0]).toBe('https://api.anthropic.com/v1/models?limit=100&after_id=claude-new');
    expect(request.mock.calls[0][1]?.headers).toMatchObject({
      'x-api-key': 'key',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
  });

  it('sanitizes catalog errors and permits retry while disconnect aborts pending discovery', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('secret-provider-error', { status: 401 }));
    const client = createBotAiClient('openai', { apiKey: 'secret', model: '', endpoint: '' }, request);
    // A rejected key gets its own app-owned message; the provider body never becomes the error text.
    await expect(client.listModels()).rejects.toThrow(/^bots\.errors\.aiKey$/);
    request.mockImplementationOnce(async (_url, options) => {
      client.disconnect();
      expect(options?.signal?.aborted).toBe(true);
      return new Response(JSON.stringify({ data: [{ id: 'gpt-6' }] }));
    });
    await expect(client.listModels()).rejects.toThrow('bots.labAi.modelsUnavailable');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('accepts a reviewed one-block strategy and rejects sub-block timing', () => {
    const strategy = {
      kind: 'dca',
      amount: '1',
      intervalMs: 6000,
      threshold: '1',
      direction: 'below',
      fastWindow: 2,
      slowWindow: 3,
      prompt: '',
    };
    expect(parseDeterministicStrategy(strategy, botFixture()).intervalMs).toBe(6000);
    expect(() => parseDeterministicStrategy({ ...strategy, intervalMs: 5999 }, botFixture())).toThrow();
  });
});
