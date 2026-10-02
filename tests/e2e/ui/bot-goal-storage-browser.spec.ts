import path from 'node:path';
import { build } from 'esbuild';
import { expect, test, type Page } from '@playwright/test';

import type { BotStorage } from '@/features/bot-trading/storage';
import type { BotDefinition } from '@/features/bot-trading/types';

interface GoalStorageTestWindow extends Window {
  BotGoalStorageTest: { createBotStorage(): BotStorage };
  goalStorageUnderTest: BotStorage;
}

let bundle = '';
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ['src/features/bot-trading/storage.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'BotGoalStorageTest',
    platform: 'browser',
    alias: { '@sora-substrate/math': path.resolve('src/lib/substrate/math/index.ts') },
    logLevel: 'silent',
  });
  bundle = result.outputFiles[0].text;
});

/** Test-only ledger snapshot: no wallet, market request or signing surface is installed. */
function drawdownBot(id: string): BotDefinition {
  return {
    version: 1,
    id,
    name: id,
    mode: 'live',
    status: 'running',
    account: 'test-account',
    network: 'test-network',
    assetIn: { address: 'xor', symbol: 'XOR', decimals: 0 },
    assetOut: { address: 'val', symbol: 'VAL', decimals: 0 },
    strategy: {
      kind: 'dca',
      amount: '10',
      intervalMs: 60000,
      threshold: '1',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { xor: '20', val: '20' },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '3',
      feeAsset: { address: 'xor', symbol: 'XOR', decimals: 0 },
      feeBudgetCodec: '10',
      sessionDurationMs: 3600000,
    },
    portfolio: { initial: { xor: '100', val: '0' }, holdings: { xor: '100', val: '0' }, feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: Date.now() + 3600000,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    goal: {
      title: 'Observed drawdown',
      targetReturnPercent: '20',
      maxLossPercent: '5',
      durationMs: 3600000,
      lossMetric: 'drawdown',
    },
    goalState: {
      startedAt: 1000,
      baselineValue: '100',
      peakValue: '100',
      lastValue: '100',
      returnPercent: '0',
      outcome: 'active',
    },
  };
}

/** Load the actual storage implementation in isolated pages sharing one IndexedDB origin. */
async function prepareStorage(page: Page): Promise<void> {
  await page.route('**/bot-goal-storage-browser-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Goal storage test</title>' })
  );
  await page.goto('/bot-goal-storage-browser-test');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const target = window as unknown as GoalStorageTestWindow;
    target.goalStorageUnderTest = target.BotGoalStorageTest.createBotStorage();
  });
}

test('durable drawdown peaks survive stale cross-tab saves and reload', async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await prepareStorage(first);
  await prepareStorage(second);
  const bot = drawdownBot('drawdown-bot');
  await first.evaluate(
    async (value) => (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.saveBot(value),
    bot
  );
  const peak = { ...bot.goalState!, peakValue: '110', lastValue: '110', returnPercent: '10' };
  expect(
    await second.evaluate(
      async ({ id, goal, state }) =>
        (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.saveGoalProgress(id, goal, state),
      { id: bot.id, goal: bot.goal!, state: peak }
    )
  ).toBe(true);
  const staleError = await first.evaluate(async (value) => {
    try {
      await (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.saveBot(value);
      return '';
    } catch (cause) {
      return (cause as Error).message;
    }
  }, bot);
  expect(staleError).toBe('bots.errors.goal');
  expect(
    await first.evaluate(
      async () => (await (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.listBots())[0]
    )
  ).toMatchObject({ goalState: peak, portfolio: bot.portfolio, activity: [] });

  // A newly opened page must read the durable peak, not recreate it from its chart or last value.
  await first.close();
  const restored = await context.newPage();
  await prepareStorage(restored);
  expect(
    await restored.evaluate(
      async () => (await (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.listBots())[0].goalState
    )
  ).toEqual(peak);
  const malformed = { ...bot, goalState: { ...peak, peakValue: undefined } };
  const malformedError = await restored.evaluate(async (value) => {
    try {
      await (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.saveBot(value);
      return '';
    } catch (cause) {
      return (cause as Error).message;
    }
  }, malformed);
  expect(malformedError).toBe('bots.errors.goal');
  const loss = { ...peak, lastValue: '103.4', returnPercent: '3.4', outcome: 'loss' as const, completedAt: 3000 };
  expect(
    await restored.evaluate(
      async ({ id, goal, state }) =>
        (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.saveGoalProgress(id, goal, state),
      { id: bot.id, goal: bot.goal!, state: loss }
    )
  ).toBe(true);
  await second.evaluate(
    async (value) => (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.saveBot(value),
    { ...bot, goalState: peak }
  );
  expect(
    await second.evaluate(
      async () => (await (window as unknown as GoalStorageTestWindow).goalStorageUnderTest.listBots())[0]
    )
  ).toMatchObject({ goalState: loss, status: 'paused', portfolio: bot.portfolio });
});
