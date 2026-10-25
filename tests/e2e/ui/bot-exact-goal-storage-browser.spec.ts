import path from 'node:path';
import { build } from 'esbuild';
import { expect, test, type Page } from '@playwright/test';
import type { createBotStorage, GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import type * as Fixtures from '../../unit/features/bot-trading/goal-storage-fixtures';

interface TestWindow extends Window {
  ExactGoalStorageTest: typeof Fixtures & { createBotStorage: typeof createBotStorage };
  storage: GoalEnabledBotStorage;
  testNow: number;
  oldDatabase?: IDBDatabase;
  oldVersionChanged?: boolean;
}
let bundle = '';
test.beforeAll(async () => {
  const built = await build({
    stdin: {
      contents:
        "export {createBotStorage} from './src/features/bot-trading/storage'; export * from './tests/unit/features/bot-trading/goal-storage-fixtures';",
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'ExactGoalStorageTest',
    platform: 'browser',
    alias: { '@sora-substrate/math': path.resolve('src/lib/substrate/math/index.ts') },
    logLevel: 'silent',
  });
  bundle = built.outputFiles[0].text;
});

/** Only an isolated synthetic document is served; this suite has no live RPC or wallet. */
async function prepare(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    if (route.request().url() === 'https://exact-goal-storage.test/')
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Exact goal storage test</title>' });
    return route.abort();
  });
  await page.goto('https://exact-goal-storage.test/');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const w = window as unknown as TestWindow;
    w.testNow = w.ExactGoalStorageTest.GOAL_TEST_START;
    w.storage = w.ExactGoalStorageTest.createBotStorage(indexedDB, { now: () => w.testNow });
  });
}
async function initialize(page: Page): Promise<GoalExecutionBot> {
  return page.evaluate(async () => {
    const w = window as unknown as TestWindow,
      f = w.ExactGoalStorageTest;
    const bot = await w.storage.goals.initialize({ ...f.goalInitializeInput(), assertCurrent: () => undefined });
    return w.storage.goals.resume({
      botId: bot.id,
      expected: f.goalExpected(bot),
      sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
      balances: bot.portfolio.holdings,
      assertCurrent: () => undefined,
    });
  });
}
async function reserve(page: Page, id = 'goal-order'): Promise<string> {
  return page.evaluate(async (orderId) => {
    const w = window as unknown as TestWindow,
      f = w.ExactGoalStorageTest;
    const bot = (await w.storage.listBots())[0] as GoalExecutionBot;
    try {
      const result = await w.storage.goals.reserve({
        botId: bot.id,
        expected: f.goalExpected(bot),
        accountingAtMs: w.testNow,
        mark: f.goalTestMark(),
        order: f.goalStorageOrder(bot, orderId),
        balances: bot.portfolio.holdings,
        assertCurrent: () => undefined,
      });
      return result.order ? 'reserved' : result.rejection!;
    } catch (error) {
      return (error as Error).message;
    }
  }, id);
}

test('same database upgrades existing state and fences version-one tabs', async ({ context }) => {
  const old = await context.newPage(),
    current = await context.newPage();
  await prepare(old);
  await old.evaluate(async () => {
    const w = window as unknown as TestWindow;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('polkaswap-bots-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('ledger');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        w.oldDatabase = request.result;
        request.result.onversionchange = () => {
          w.oldVersionChanged = true;
          request.result.close();
        };
        const tx = request.result.transaction('ledger', 'readwrite');
        tx.objectStore('ledger').put({ bots: [], orders: [], preservedMigrationSentinel: 'same-record' }, 'state');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await prepare(current);
  expect(await current.evaluate(() => (window as unknown as TestWindow).storage.listBots())).toEqual([]);
  expect(await old.evaluate(() => (window as unknown as TestWindow).oldVersionChanged)).toBe(true);
  expect(
    await old.evaluate(
      async () =>
        new Promise<string>((resolve) => {
          const request = indexedDB.open('polkaswap-bots-v1', 1);
          request.onerror = () => resolve(request.error!.name);
          request.onsuccess = () => {
            request.result.close();
            resolve('unexpected');
          };
        })
    )
  ).toBe('VersionError');
  expect(
    await old.evaluate(() => {
      try {
        (window as unknown as TestWindow).oldDatabase!.transaction('ledger');
        return 'unexpected';
      } catch (error) {
        return (error as DOMException).name;
      }
    })
  ).toBe('InvalidStateError');
  expect(
    await current.evaluate(
      async () =>
        new Promise<unknown>((resolve, reject) => {
          const request = indexedDB.open('polkaswap-bots-v1', 2);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result,
              read = db.transaction('ledger').objectStore('ledger').get('state');
            read.onsuccess = () => {
              db.close();
              resolve(read.result.preservedMigrationSentinel);
            };
          };
        })
    )
  ).toBe('same-record');
});

test('actual IndexedDB serializes cross-tab reservation and rejects marker-stripped legacy mutations', async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await prepare(a);
  await prepare(b);
  const opening = await initialize(a);
  const results = await Promise.all([reserve(a, 'a-order'), reserve(b, 'b-order')]);
  expect(results.filter((v) => v === 'reserved')).toHaveLength(1);
  expect(results.filter((v) => v === 'bots.errors.pending')).toHaveLength(1);
  expect(await a.evaluate(async () => (await (window as unknown as TestWindow).storage.listOrders()).length)).toBe(1);
  const errors = await b.evaluate(async () => {
    const w = window as unknown as TestWindow;
    const bot = (await w.storage.listBots())[0] as GoalExecutionBot;
    const order = (await w.storage.listOrders())[0] as GoalExecutionOrder;
    const { goalExecution: _g, exactGoalState: _s, goalControl: _c, goalSignal: _signal, ...strippedBot } = bot;
    const { goalExecution: _o, ...strippedOrder } = order;
    const operations = [
      () => w.storage.saveBot(strippedBot),
      () => w.storage.allocate(strippedBot, bot.portfolio.holdings),
      () => w.storage.reserve({ ...strippedOrder, id: 'other', intentId: 'other' }, bot.portfolio.holdings),
      () => w.storage.markSigned(order.id, w.ExactGoalStorageTest.goalTestHash(999), 100),
      () => w.storage.markSubmitted(order.id),
      () => w.storage.settle(order.id, { success: false, outputCodec: '0', actualFeeCodec: '0' }),
      () => w.storage.stopBot(bot.id),
      () => w.storage.deleteBot(bot.id),
    ];
    const failures: string[] = [];
    for (const operation of operations) {
      try {
        await operation();
        failures.push('unexpected');
      } catch (error) {
        failures.push((error as Error).message);
      }
    }
    return failures;
  });
  expect(errors).toEqual(Array(8).fill('bots.errors.policy'));
  expect(
    await b.evaluate(async () => (await (window as unknown as TestWindow).storage.listBots())[0].portfolio)
  ).toEqual(opening.portfolio);
});

test('finalized receipt survives reload without a fresh mark and settles atomically once', async ({ context }) => {
  const a = await context.newPage();
  await prepare(a);
  await initialize(a);
  expect(await reserve(a)).toBe('reserved');
  await a.evaluate(async () => {
    const w = window as unknown as TestWindow,
      f = w.ExactGoalStorageTest;
    const order = (await w.storage.listOrders())[0] as GoalExecutionOrder;
    await w.storage.goals.sign({
      orderId: order.id,
      expectedOrderRevision: 0,
      txHash: f.goalTestHash(999),
      signedAtBlock: 100,
      envelopeDigest: order.goalExecution.envelopeDigest,
      signedEnvelopeDigest: f.goalTestSha(8),
    });
    await w.storage.goals.submit({
      orderId: order.id,
      expected: f.goalExpected((await w.storage.listBots())[0] as GoalExecutionBot),
      expectedOrderRevision: 1,
      txHash: f.goalTestHash(999),
      assertCurrent: () => undefined,
    });
    w.testNow += 60000;
    await w.storage.goals.persistFinalReceipt({ orderId: order.id, receipt: f.goalStorageReceipt(order) });
  });
  await a.close();
  const b = await context.newPage(),
    c = await context.newPage();
  await prepare(b);
  await prepare(c);
  const durable = await b.evaluate(async () => {
    const w = window as unknown as TestWindow;
    return { bot: (await w.storage.listBots())[0], order: (await w.storage.listOrders())[0] as GoalExecutionOrder };
  });
  expect(durable.bot.status).toBe('running');
  expect(durable.bot.sessionExpiresAt).toBeGreaterThan(1000000);
  expect(durable.order.goalExecution.phase).toBe('finalized-pending');
  expect(durable.order.finalReceipt?.accounting).toBe('pending');
  // A failed final synchronous context check must abort both order and exact-state changes.
  expect(
    await b.evaluate(async () => {
      const w = window as unknown as TestWindow,
        f = w.ExactGoalStorageTest;
      const bot = (await w.storage.listBots())[0] as GoalExecutionBot;
      w.testNow += 60000;
      let checks = 0;
      try {
        await w.storage.goals.applyReceipt({
          orderId: 'goal-order',
          botId: bot.id,
          expected: f.goalAccountingExpected(bot),
          accountingAtMs: w.testNow,
          mark: f.goalTestMark(101, w.testNow),
          assertCurrent: () => {
            if (++checks === 2) throw Error('changed-context');
          },
        });
        return 'unexpected';
      } catch (error) {
        return (error as Error).message;
      }
    })
  ).toBe('changed-context');
  expect(
    await b.evaluate(async () => ({
      bot: (await (window as unknown as TestWindow).storage.listBots())[0],
      order: (await (window as unknown as TestWindow).storage.listOrders())[0],
    }))
  ).toEqual(durable);
  const apply = (page: Page) =>
    page.evaluate(async () => {
      const w = window as unknown as TestWindow,
        f = w.ExactGoalStorageTest;
      w.testNow = f.GOAL_TEST_START + 60000;
      const bot = (await w.storage.listBots())[0] as GoalExecutionBot;
      return w.storage.goals.applyReceipt({
        orderId: 'goal-order',
        botId: bot.id,
        expected: f.goalAccountingExpected(bot),
        accountingAtMs: w.testNow,
        mark: f.goalTestMark(101, w.testNow),
        assertCurrent: () => undefined,
      });
    });
  const [first, second] = await Promise.all([apply(b), apply(c)]);
  expect([first.duplicate, second.duplicate].sort()).toEqual([false, true]);
  expect(first.bot.portfolio).toEqual(second.bot.portfolio);
  expect(first.bot.portfolio.trades).toBe(1);
  expect(first.bot.status).toBe('running');
  expect(first.bot.sessionExpiresAt).toBe(durable.bot.sessionExpiresAt);
  expect(first.bot.portfolio.feesPaidCodec).toBe('10000000000000000');
  expect(first.order.finalReceipt?.accounting).toBe('applied');
});

test('cross-tab pause fences stale Start without depending on accounting revision', async ({ context }) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await prepare(a);
  await prepare(b);
  const original = await initialize(a);
  const observed = await a.evaluate(async () => {
    const w = window as unknown as TestWindow,
      f = w.ExactGoalStorageTest;
    const bot = (await w.storage.listBots())[0] as GoalExecutionBot;
    w.testNow += 6000;
    return w.storage.goals.observe({
      botId: bot.id,
      expected: f.goalExpected(bot),
      accountingAtMs: w.testNow,
      mark: f.goalTestMark(101, w.testNow),
      assertCurrent: () => undefined,
    });
  });
  const paused = await b.evaluate(async (bot) => {
    const w = window as unknown as TestWindow,
      f = w.ExactGoalStorageTest;
    return w.storage.goals.pause({ botId: bot.id, expected: f.goalControlExpected(bot) });
  }, original);
  expect(paused.exactGoalState).toEqual(observed.exactGoalState);
  expect(paused.goalControl.revision).toBe(original.goalControl.revision + 1);
  expect(
    await a.evaluate(async (bot) => {
      const w = window as unknown as TestWindow,
        f = w.ExactGoalStorageTest;
      try {
        await w.storage.goals.resume({
          botId: bot.id,
          expected: f.goalExpected(bot),
          sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
          balances: bot.portfolio.holdings,
          assertCurrent: () => undefined,
        });
        return 'unexpected';
      } catch (error) {
        return (error as Error).message;
      }
    }, observed)
  ).toBe('bots.errors.stale');
});

test('stored undefined protocol markers reject before list projections can discard them', async ({ page }) => {
  await prepare(page);
  await page.evaluate(() => (window as unknown as TestWindow).storage.listBots());
  for (const marker of ['goalExecution', 'exactGoalState', 'goalControl', 'goalSignal']) {
    await page.evaluate(
      async (key) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open('polkaswap-bots-v1', 2);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction('ledger', 'readwrite');
            tx.objectStore('ledger').put(
              { bots: [{ id: 'corrupt', [key]: undefined }], orders: [{ id: 'corrupt', [key]: undefined }] },
              'state'
            );
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      marker
    );
    expect(
      await page.evaluate(async () => {
        const w = window as unknown as TestWindow;
        const results: boolean[] = [];
        for (const read of [() => w.storage.listBots(), () => w.storage.listOrders()]) {
          try {
            await read();
            results.push(false);
          } catch {
            results.push(true);
          }
        }
        return results;
      })
    ).toEqual([true, true]);
  }
});

test('a completed-hour decision commits once across tabs and remains consumed after reload', async ({ context }) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await prepare(a);
  await prepare(b);
  const original = await initialize(a);
  const consume = (page: Page) =>
    page.evaluate(async (bot) => {
      const w = window as unknown as TestWindow,
        f = w.ExactGoalStorageTest;
      try {
        await w.storage.goals.recordSignal({
          botId: bot.id,
          expected: f.goalExpected(bot),
          expectedCompletedAtMs: bot.goalSignal.completedAtMs,
          accountingAtMs: w.testNow,
          mark: f.goalTestMark(),
          completedAtMs: Math.floor(w.testNow / 3600000) * 3600000,
          strategyState: { ...bot.state, lastEvaluatedAt: w.testNow },
          assertCurrent: () => undefined,
        });
        return 'consumed';
      } catch (error) {
        return (error as Error).message;
      }
    }, original);
  expect((await Promise.all([consume(a), consume(b)])).sort()).toEqual(['bots.errors.stale', 'consumed']);
  await a.close();
  await b.close();
  const reloaded = await context.newPage();
  await prepare(reloaded);
  const current = await reloaded.evaluate(
    async () => (await (window as unknown as TestWindow).storage.listBots())[0] as GoalExecutionBot
  );
  expect(current.goalSignal.completedAtMs).toBe(0);
  expect(current.state.lastEvaluatedAt).toBe(1000000);
  expect(current.portfolio).toEqual(original.portfolio);
  expect(await consume(reloaded)).toBe('bots.errors.stale');
});
