import path from 'node:path';
import { build } from 'esbuild';
import { expect, test, type Page } from '@playwright/test';

import type { BotStorage } from '@/features/bot-trading/storage';
import type { BotDefinition, BotOrder } from '@/features/bot-trading/types';

interface StorageTestWindow extends Window {
  BotStorageTest: { createBotStorage(): BotStorage };
  storageUnderTest: BotStorage;
  releaseTestLease?: () => void;
}

let bundle = '';
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ['src/features/bot-trading/storage.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'BotStorageTest',
    platform: 'browser',
    alias: { '@sora-substrate/math': path.resolve('src/lib/substrate/math/index.ts') },
    logLevel: 'silent',
  });
  bundle = result.outputFiles[0].text;
});

/** Minimal test-only account: integer amounts make successful ledger settlement easy to audit. */
function makeBot(id: string): BotDefinition {
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
    portfolio: { initial: { xor: '70', val: '0' }, holdings: { xor: '70', val: '0' }, feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: Date.now() + 3600000,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
  };
}

/** Install the actual storage module in a blank same-origin page; no production globals are added. */
async function prepareStorage(page: Page): Promise<void> {
  await page.route('**/bot-storage-browser-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Bot storage test</title>' })
  );
  await page.goto('/bot-storage-browser-test');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const target = window as unknown as StorageTestWindow;
    target.storageUnderTest = target.BotStorageTest.createBotStorage();
  });
}

for (const browserName of ['chromium', 'webkit'] as const) {
  test(`${browserName}: real IndexedDB races and native cross-tab Web Locks`, async ({ playwright, baseURL }) => {
    const browser = await playwright[browserName].launch();
    try {
      const context = await browser.newContext({ baseURL });
      const first = await context.newPage();
      const second = await context.newPage();
      await prepareStorage(first);
      await prepareStorage(second);
      const allocate = (page: Page, bot: BotDefinition) =>
        page.evaluate(async (value) => {
          try {
            await (window as unknown as StorageTestWindow).storageUnderTest.allocate(value, { xor: '100', val: '0' });
            return { ok: true, id: value.id };
          } catch (cause) {
            return { ok: false, id: value.id, error: (cause as Error).message };
          }
        }, bot);
      const results = await Promise.all([allocate(first, makeBot('bot-a')), allocate(second, makeBot('bot-b'))]);
      expect(results.filter((item) => item.ok)).toHaveLength(1);
      expect(results.find((item) => !item.ok)?.error).toBe('bots.errors.balance');
      const botId = results.find((item) => item.ok)!.id;
      const order: BotOrder = {
        id: 'order-1',
        botId,
        account: 'test-account',
        network: 'test-network',
        intentId: 'intent-1',
        status: 'reserved',
        inputAsset: 'xor',
        inputCodec: '10',
        outputAsset: 'val',
        minOutputCodec: '9',
        feeAsset: 'xor',
        feeCodec: '2',
        createdAt: Date.now(),
      };
      await first.evaluate(async (value) => {
        const storage = (window as unknown as StorageTestWindow).storageUnderTest;
        await storage.reserve(value, { xor: '100', val: '0' });
        await storage.markSigned(value.id, `0x${'a'.repeat(64)}`, 123);
      }, order);
      expect(
        await second.evaluate(
          async () => (await (window as unknown as StorageTestWindow).storageUnderTest.listOrders())[0]
        )
      ).toMatchObject({ status: 'signed', txHash: `0x${'a'.repeat(64)}`, signedAtBlock: 123 });
      const stopError = await second.evaluate(async (id) => {
        try {
          await (window as unknown as StorageTestWindow).storageUnderTest.stopBot(id);
          return '';
        } catch (cause) {
          return (cause as Error).message;
        }
      }, botId);
      expect(stopError).toBe('bots.errors.pending');
      const duplicate = await second.evaluate(async (value) => {
        try {
          await (window as unknown as StorageTestWindow).storageUnderTest.reserve(
            { ...value, id: 'order-2' },
            { xor: '100', val: '0' }
          );
          return '';
        } catch (cause) {
          return (cause as Error).message;
        }
      }, order);
      expect(duplicate).toBe('bots.errors.pending');
      await second.evaluate(async () => {
        const storage = (window as unknown as StorageTestWindow).storageUnderTest;
        await storage.markSubmitted('order-1');
        await storage.settle('order-1', { success: true, outputCodec: '9', actualFeeCodec: '2' });
        await storage.settle('order-1', { success: true, outputCodec: '9', actualFeeCodec: '2' });
      });
      expect(
        await first.evaluate(
          async () => (await (window as unknown as StorageTestWindow).storageUnderTest.listBots())[0].portfolio
        )
      ).toMatchObject({ holdings: { xor: '58', val: '9' }, feesPaidCodec: '2', trades: 1 });
      await first.evaluate(async (id) => (window as unknown as StorageTestWindow).storageUnderTest.stopBot(id), botId);
      await second.reload();
      await second.addScriptTag({ content: bundle });
      expect(
        await second.evaluate(
          async () =>
            (await (window as unknown as StorageTestWindow).BotStorageTest.createBotStorage().listOrders())[0].status
        )
      ).toBe('confirmed');

      // This checks the browser primitive and exact production key convention, not the private signer adapter.
      const leaseName = 'polkaswap-bot:test-network:test-account';
      await first.evaluate(async (key) => {
        await new Promise<void>((resolve, reject) => {
          void navigator.locks
            .request(key, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
              if (!lock) {
                reject(new Error('lease unavailable'));
                return;
              }
              await new Promise<void>((release) => {
                (window as unknown as StorageTestWindow).releaseTestLease = release;
                resolve();
              });
            })
            .catch(reject);
        });
      }, leaseName);
      const available = (page: Page) =>
        page.evaluate(
          (key) => navigator.locks.request(key, { mode: 'exclusive', ifAvailable: true }, (lock) => Boolean(lock)),
          leaseName
        );
      expect(await available(second)).toBe(false);
      await first.evaluate(() => (window as unknown as StorageTestWindow).releaseTestLease?.());
      await expect.poll(() => available(second)).toBe(true);
    } finally {
      await Promise.all(
        browser
          .contexts()
          .flatMap((context) => context.pages())
          .map((page) => page.unrouteAll({ behavior: 'ignoreErrors' }))
      );
      await browser.close();
    }
  });
}
