import path from 'node:path';
import { build } from 'esbuild';
import { expect, test, type Page } from '@playwright/test';
import type { ExperimentRun } from '@/features/bot-trading/experiments';
import type { BotDefinition, BotHistory } from '@/features/bot-trading/types';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import { ensureAppLoaded, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

test.describe.configure({ mode: 'default' });
let engineBundle = '';
let workerBundle = '';

/** All strategies share one visible chooser; responsive rows never introduce a separate hidden catalog. */
async function expectStrategyPicker(page: Page, columns: number): Promise<void> {
  const picker = page.getByTestId('lab-strategy-picker');
  await expect(picker.locator(':scope > button')).toHaveCount(12);
  await expect
    .poll(() => picker.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length))
    .toBe(columns);
  await expect(page.locator('.rule-recipes')).toHaveCount(0);
  await expect(page.locator('.lab-presets .lab-rule')).toHaveCount(0);
}

/** One selected illustration sits directly before the main Run action, with editing controls below. */
async function expectSelectedPreview(page: Page, kind: 'strategy-flow' | 'rule-flow'): Promise<void> {
  const preview = page.getByTestId('lab-strategy-preview');
  await expect(preview).toHaveCount(1);
  await expect(preview.getByTestId(kind)).toHaveCount(1);
  await expect(page.locator('[data-testid="strategy-flow"], [data-testid="rule-flow"]')).toHaveCount(1);
  await expect(
    page.locator('.lab-builder [data-testid="strategy-flow"], .lab-builder [data-testid="rule-flow"]')
  ).toHaveCount(0);
  expect(
    await preview.evaluate((element) => ({
      followsHistory: element.previousElementSibling?.classList.contains('lab-quick-options'),
      immediatelyBeforeRun: element.nextElementSibling?.getAttribute('data-testid') === 'lab-launch',
    }))
  ).toEqual({ followsHistory: true, immediatelyBeforeRun: true });
}

test.beforeAll(async () => {
  const common = {
    bundle: true,
    write: false,
    platform: 'browser' as const,
    alias: { '@sora-substrate/math': path.resolve('src/lib/substrate/math/index.ts') },
    logLevel: 'silent' as const,
  };
  const engine = await build({
    ...common,
    format: 'iife',
    globalName: 'LabEngineTest',
    stdin: {
      contents: `export { createExperimentRunner } from './src/features/bot-trading/research-runner';
      export { createExperimentStorage } from './src/features/bot-trading/experiment-storage';
      export { RESEARCH_DEFAULT_SETTINGS } from './src/features/bot-trading/research';`,
      resolveDir: process.cwd(),
      loader: 'ts',
    },
  });
  engineBundle = engine.outputFiles[0].text;
  const worker = await build({
    ...common,
    format: 'iife',
    entryPoints: ['src/features/bot-trading/research.worker.ts'],
  });
  workerBundle = worker.outputFiles[0].text;
});

/** The default UI uses the normal offline network fixtures; absent chain evidence must never produce fake results. */
for (const theme of ['light', 'dark'] as const) {
  test(`Strategy Lab ${theme}: offline view, verified-token boundary and responsive themed controls`, async ({
    page,
  }, testInfo) => {
    await preparePage(page, { stubRuntimeEnv: true });
    // Desktop screen orientation does not follow emulated viewport resizing in WebKit.
    await page.addInitScript(() => {
      const nativeOrientation = screen.orientation;
      Object.defineProperty(screen, 'orientation', {
        configurable: true,
        value: {
          get type() {
            return innerWidth > innerHeight ? 'landscape-primary' : 'portrait-primary';
          },
          addEventListener: (...args: Parameters<ScreenOrientation['addEventListener']>) =>
            nativeOrientation?.addEventListener(...args),
          removeEventListener: (...args: Parameters<ScreenOrientation['removeEventListener']>) =>
            nativeOrientation?.removeEventListener(...args),
        },
      });
    });
    await page.addInitScript((selectedTheme) => localStorage.setItem('dexSettings.theme', selectedTheme), theme);
    const errors = trackConsole(page);
    await page.goto(`${ipfsEntryUrl}#/bots`);
    await ensureAppLoaded(page);
    await expect(page.getByTestId('strategy-lab-tab')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('strategy-lab')).toBeVisible();
    await expect(page.getByTestId('lab-input-token')).toBeVisible();
    await expect(page.getByTestId('lab-output-token')).toBeVisible();
    const tokenOrder = await page.locator('.bots-page').evaluate((element) => {
      const first = element.firstElementChild;
      const input = element.querySelector('[data-testid="lab-input-token"]')!;
      const output = element.querySelector('[data-testid="lab-output-token"]')!;
      const title = element.querySelector('h1')!;
      const amount = element.querySelector('[data-testid="lab-capital"]')!;
      const picker = element.querySelector('[data-testid="lab-strategy-picker"]')!;
      const history = element.querySelector('[data-testid="lab-history-range"]')!;
      const preview = element.querySelector('[data-testid="lab-strategy-preview"]')!;
      const action = element.querySelector('[data-testid="lab-run-batch"]')!;
      const settings = element.querySelector('.lab-settings')!;
      const secondaryAction = element.querySelector('[data-testid="lab-run-selected"]')!;
      return {
        firstContainsPair: Boolean(first?.contains(input) && first.contains(output)),
        aboveTitle:
          Math.max(input.getBoundingClientRect().bottom, output.getBoundingClientRect().bottom) <=
          title.getBoundingClientRect().top,
        actionAfterAmount: action.getBoundingClientRect().top >= amount.getBoundingClientRect().bottom,
        choicesAfterAmount: picker.getBoundingClientRect().top >= amount.getBoundingClientRect().bottom,
        actionAfterChoices: action.getBoundingClientRect().top >= picker.getBoundingClientRect().bottom,
        previewAfterHistory: preview.getBoundingClientRect().top >= history.getBoundingClientRect().bottom,
        actionAfterPreview: action.getBoundingClientRect().top >= preview.getBoundingClientRect().bottom,
        secondaryActionAfterSettings:
          secondaryAction.getBoundingClientRect().top >= settings.getBoundingClientRect().bottom,
        actionBeforeTitle: action.getBoundingClientRect().bottom <= title.getBoundingClientRect().top,
        prominentAction: action.getBoundingClientRect().height >= 56,
      };
    });
    expect(tokenOrder).toEqual({
      firstContainsPair: true,
      aboveTitle: true,
      actionAfterAmount: true,
      choicesAfterAmount: true,
      actionAfterChoices: true,
      previewAfterHistory: true,
      actionAfterPreview: true,
      secondaryActionAfterSettings: true,
      actionBeforeTitle: true,
      prominentAction: true,
    });
    await expect(page.getByTestId('lab-run-batch')).toHaveAccessibleName('Run results');
    await expectSelectedPreview(page, 'strategy-flow');
    await expectStrategyPicker(page, 4);
    await expect(page.getByTestId('lab-strategy-picker').locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByTestId('lab-quick-preset-dca')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.lab-compare-presets input[type="checkbox"]')).toHaveCount(3);
    await expect(page.getByTestId('lab-preset-dca')).toBeChecked();
    await page.getByTestId('lab-preset-threshold').check();
    await expect(page.getByTestId('lab-quick-preset-dca')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('lab-strategy-picker').locator('[aria-pressed="true"]')).toHaveCount(1);
    await page.getByTestId('lab-preset-threshold').uncheck();
    await expect(page.getByTestId('bot-playground')).toHaveCount(0);
    await expect(page.getByTestId('lab-experiment-grid')).toHaveCount(0);
    for (const recipe of [
      'spring',
      'trend',
      'breakout',
      'dip',
      'quiet',
      'persistent',
      'range',
      'rebound',
      'expansion',
    ]) {
      await expect(page.getByTestId(`rule-recipe-${recipe}`)).toBeVisible();
    }
    await page.getByTestId('lab-capital').fill('0');
    await expect(page.getByTestId('lab-run-batch')).toBeDisabled();
    await page.getByTestId('lab-capital').fill('100');
    const palette = await page.locator('.bots-page').evaluate((element) => ({
      channels: (getComputedStyle(element).backgroundColor.match(/\d+/g) || []).slice(0, 3).map(Number),
      inputShadow: getComputedStyle(element.querySelector('[data-testid="lab-capital"]')!).boxShadow,
    }));
    expect(palette.channels).toHaveLength(3);
    const average = palette.channels.reduce((sum, channel) => sum + channel, 0) / 3;
    expect(theme === 'light' ? average > 180 : average < 90).toBe(true);
    expect(palette.inputShadow).toContain('inset');
    // Native themes are exact app token values, not merely "some light/dark color".
    const nativePalette = async () =>
      page.locator('.bots-page').evaluate((element) => {
        const probe = document.createElement('span');
        element.appendChild(probe);
        probe.style.backgroundColor = 'var(--s-color-utility-surface)';
        const nativeSurface = getComputedStyle(probe).backgroundColor;
        probe.style.backgroundColor = 'var(--s-color-base-background)';
        const nativeInput = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return {
          surface: getComputedStyle(element).backgroundColor,
          nativeSurface,
          input: getComputedStyle(element.querySelector('[data-testid="lab-capital"]')!).backgroundColor,
          nativeInput,
        };
      });
    const initialPalette = await nativePalette();
    expect(initialPalette.surface).toBe(initialPalette.nativeSurface);
    expect(initialPalette.input).toBe(initialPalette.nativeInput);
    await page.getByTestId('lab-capital').fill('25.5');
    await page.locator('.app-header-menu .header-menu__button').first().click();
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    await page.locator(`.header-menu [data-test-name="${nextTheme === 'dark' ? 'noir' : 'light'}"]`).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('design-system-theme', nextTheme);
    const switchedPalette = await nativePalette();
    expect(switchedPalette.surface).toBe(switchedPalette.nativeSurface);
    expect(switchedPalette.input).toBe(switchedPalette.nativeInput);
    expect(switchedPalette.surface).not.toBe(initialPalette.surface);
    await expect(page.getByTestId('lab-capital')).toHaveValue('25.5');
    await page.locator('.app-header-menu .header-menu__button').first().click();
    await page.locator(`.header-menu [data-test-name="${theme === 'dark' ? 'noir' : 'light'}"]`).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('design-system-theme', theme);
    await expect(page.getByTestId('strategy-flow')).toHaveAttribute('data-mode', 'illustrative');
    await expect(page.getByTestId('lab-data-status')).toContainText('Historical resolution: one hour');
    await page.screenshot({ path: testInfo.outputPath('lab-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByTestId('lab-input-token')).toBeVisible();
    await expect(page.getByTestId('lab-output-token')).toBeVisible();
    await expectStrategyPicker(page, 2);
    await expectSelectedPreview(page, 'strategy-flow');
    await page.getByTestId('lab-run-batch').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('lab-run-batch')).toBeInViewport();
    expect(
      await page.getByTestId('strategy-lesson').evaluate((element) => element.getBoundingClientRect().height)
    ).toBeGreaterThanOrEqual(160);
    await expect(page.getByTestId('lab-create-bot')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('lab-mobile.png'), fullPage: true });
    await page.getByTestId('rule-recipe-spring').click();
    await expect(page.getByTestId('rule-recipe-spring')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('lab-strategy-picker').locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByTestId('lab-selected-strategy-idea')).toContainText(
      'prior prices show a restoring tendency'
    );
    await expectSelectedPreview(page, 'rule-flow');
    await expect(page.getByTestId('rule-invalid')).toHaveCount(0);
    await expect(page.getByTestId('rule-kind-entry-0')).toHaveValue('restoring');
    await expect(page.getByTestId('rule-kind-entry-0').locator('option')).toHaveCount(18);
    await expect(page.getByTestId('rule-kind-entry-1')).toHaveValue('restoring');
    await expect(page.getByTestId('rule-threshold-entry-1')).toHaveValue('100');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('spring-mobile.png'), fullPage: true });
    await page.getByTestId('rule-kind-entry-0').selectOption('efficiency');
    await page.getByTestId('rule-threshold-entry-0').fill('101');
    await expect(page.getByTestId('rule-invalid')).toBeVisible();
    await expect(page.getByTestId('rule-share')).toBeDisabled();
    await page.getByTestId('rule-recipe-spring').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectStrategyPicker(page, 4);
    const motion = await page
      .getByTestId('rule-recipe-spring')
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    // The app's global reduced-motion rule keeps a 0.01ms duration for transition-end compatibility.
    expect(Math.max(...motion.split(',').map((duration) => Number.parseFloat(duration)))).toBeLessThanOrEqual(0.001);
    await page.getByTestId('rule-recipe-spring').hover();
    expect(
      await page.getByTestId('rule-recipe-spring').evaluate((element) => getComputedStyle(element).transform)
    ).toBe('none');
    await page.getByTestId('lab-input-token').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('spring-desktop.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
}

interface LabEngineWindow {
  LabEngineTest: {
    createExperimentRunner: typeof import('@/features/bot-trading/research-runner').createExperimentRunner;
    createExperimentStorage: typeof import('@/features/bot-trading/experiment-storage').createExperimentStorage;
    RESEARCH_DEFAULT_SETTINGS: typeof import('@/features/bot-trading/research').RESEARCH_DEFAULT_SETTINGS;
  };
}

/** Install actual application modules in a disposable same-origin page, never in the production application. */
async function prepareEngine(page: Page): Promise<void> {
  await page.route('**/bot-strategy-lab-engine-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Strategy lab engine test fixtures</title>' })
  );
  await page.goto('/bot-strategy-lab-engine-test');
  await page.addScriptTag({ content: engineBundle });
}

for (const browserName of ['chromium', 'webkit'] as const) {
  test(`Strategy Lab ${browserName}: native workers stream exact results and isolated IndexedDB restores them`, async ({
    playwright,
    baseURL,
  }) => {
    const browser = await playwright[browserName].launch();
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const workerUrls: string[] = [];
    const errors: string[] = [];
    page.on('worker', (worker) => workerUrls.push(worker.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await prepareEngine(page);
      const outcome = await page.evaluate(async (workerCode) => {
        const api = (window as unknown as LabEngineWindow).LabEngineTest;
        const storage = api.createExperimentStorage();
        const now = Date.UTC(2026, 8, 14, 12),
          hour = 3_600_000;
        const assets = [
          { address: `0x0200${'0'.repeat(60)}`, symbol: 'XOR', decimals: 18 },
          { address: `0x020004${'0'.repeat(58)}`, symbol: 'VAL', decimals: 18 },
          { address: `0x020005${'0'.repeat(58)}`, symbol: 'PSWAP', decimals: 18 },
        ];
        const identity = { genesisHash: `0x${'b'.repeat(64)}`, denominator: '1' };
        // Explicitly fabricated test-only observations exercise the public-provider boundary, not real historical evidence.
        const history: BotHistory = {
          candles: Array.from({ length: 512 }, (_, index) => ({
            timestamp: now - (511 - index) * hour,
            close: index % 4 < 2 ? '2' : '3',
            feeClose: '1',
          })),
          missing: 0,
          denominationVerified: true,
          identity,
        };
        const fee = (bot: BotDefinition): ResearchFeeSnapshot => ({
          networkFeeXor: '0.1',
          priceImpactPercent: '0',
          sellPriceImpactPercent: '0',
          networkFeeCodec: '100000000000000000',
          swapFeePercent: '0.6',
          sellNetworkFeeXor: '0.2',
          sellNetworkFeeCodec: '200000000000000000',
          sellSwapFeePercent: '0.8',
          queriedAt: now,
          expiresAt: now + 60_000,
          blockNumber: 10,
          blockHash: `0x${'a'.repeat(64)}`,
          ...identity,
          endpoint: 'wss://fixture.invalid',
          amountIn: bot.strategy.amount,
          amountOut: '5',
          sellAmountIn: '5',
          sellAmountOut: '9',
          assetInAddress: bot.assetIn.address,
          assetOutAddress: bot.assetOut.address,
          dexId: 0,
          route: [bot.assetIn.address, bot.assetOut.address],
          routeFees: [],
          sellDexId: 0,
          sellRoute: [bot.assetOut.address, bot.assetIn.address],
          sellRouteFees: [],
        });
        const workerUrl = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
        const progress: Array<{ id: string; completed: number; total: number; timestamp: number }> = [];
        const saves: Promise<void>[] = [];
        const settings = {
          ...api.RESEARCH_DEFAULT_SETTINGS,
          historyStartAt: undefined,
          historyEndAt: now,
          validation: 'holdout' as const,
          assetInAddress: assets[0].address,
          assetOutAddress: assets[1].address,
        };
        const reviewed = {
          kind: 'threshold' as const,
          amount: '7.000000000000000001',
          intervalMs: 120_000,
          threshold: '2.5',
          direction: 'below' as const,
          fastWindow: 3,
          slowWindow: 8,
          prompt: '',
        };
        const runner = api.createExperimentRunner({
          assets,
          now: () => now,
          loadHistory: async () => structuredClone(history),
          loadFees: async (bot) => fee(bot),
          workerFactory: () => new Worker(workerUrl),
          onUpdate: (run) => {
            if (run.partial)
              progress.push({
                id: run.id,
                completed: run.partial.completed,
                total: run.partial.total,
                timestamp: run.partial.timestamp,
              });
            if (run.status === 'complete') saves.push(storage.save(run));
          },
        });
        try {
          const result = await runner.run([
            { id: 'fixture-dca', name: 'Fixture scheduled buys', settings },
            {
              id: 'fixture-sma',
              name: 'Fixture alternative market',
              settings: { ...settings, preset: 'sma', assetOutAddress: assets[2].address },
            },
            {
              id: 'fixture-reviewed',
              name: 'Fixture reviewed exact rule',
              settings: { ...settings, preset: 'threshold' },
              strategy: reviewed,
            },
            {
              id: 'fixture-rules',
              name: 'Fixture mixed rules',
              settings: { ...settings, intervalBlocks: 600, optimize: false, validation: 'walk-forward', folds: 3 },
              strategy: {
                ...reviewed,
                kind: 'rules',
                intervalMs: 3_600_000,
                rules: {
                  version: 1,
                  entry: {
                    operator: 'all',
                    conditions: [
                      { kind: 'momentum', window: 2, direction: 'above', threshold: '0' },
                      { kind: 'trend', window: 4, direction: 'above' },
                    ],
                  },
                  exit: {
                    operator: 'any',
                    conditions: [
                      { kind: 'momentum', window: 2, direction: 'below', threshold: '0' },
                      { kind: 'breakout', window: 2, direction: 'below' },
                    ],
                  },
                },
              },
            },
          ]);
          await Promise.all(saves);
          const stored = await storage.list();
          const read = (run: ExperimentRun) => ({
            id: run.id,
            status: run.status,
            strategy: run.result!.bot.strategy,
            assetIn: run.result!.bot.assetIn.address,
            assetOut: run.result!.bot.assetOut.address,
            trades: run.result!.result.trades,
            botTrades: run.result!.bot.portfolio.trades,
            amountIn: run.fees!.amountIn,
            returnPercent: run.result!.result.returnPercent,
          });
          return {
            runs: result.map(read),
            stored: stored.map(read),
            progress,
            databases:
              typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).map((db) => db.name) : [],
          };
        } finally {
          runner.dispose();
          storage.close();
          URL.revokeObjectURL(workerUrl);
        }
      }, workerBundle);
      expect(outcome.runs.map((run) => run.status)).toEqual(['complete', 'complete', 'complete', 'complete']);
      expect([...outcome.stored].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
        [...outcome.runs].sort((a, b) => a.id.localeCompare(b.id))
      );
      expect(new Set(outcome.runs.map((run) => run.assetOut)).size).toBe(2);
      expect(outcome.runs.every((run) => run.botTrades === 0)).toBe(true);
      expect(outcome.runs[2].strategy).toMatchObject({
        amount: '7.000000000000000001',
        intervalMs: 120_000,
        threshold: '2.5',
        direction: 'below',
      });
      expect(outcome.runs[2].amountIn).toBe('7.000000000000000001');
      expect(outcome.runs[3].strategy).toMatchObject({
        kind: 'rules',
        rules: {
          version: 1,
          entry: { operator: 'all', conditions: [{ kind: 'momentum' }, { kind: 'trend' }] },
          exit: { operator: 'any', conditions: [{ kind: 'momentum' }, { kind: 'breakout' }] },
        },
      });
      expect(outcome.runs[3].trades).toBeGreaterThan(0);
      expect(outcome.progress.some((progress) => progress.completed > 0 && progress.completed < progress.total)).toBe(
        true
      );
      expect(outcome.progress.every((progress) => Number.isSafeInteger(progress.timestamp))).toBe(true);
      expect(workerUrls).toHaveLength(4);
      expect(outcome.databases).not.toContain('polkaswap-bots-v1');
      await page.reload();
      await page.addScriptTag({ content: engineBundle });
      const restored = await page.evaluate(async () => {
        const storage = (window as unknown as LabEngineWindow).LabEngineTest.createExperimentStorage();
        try {
          return (await storage.list()).map((run) => ({ id: run.id, returnPercent: run.result!.result.returnPercent }));
        } finally {
          storage.close();
        }
      });
      expect(restored).toEqual(outcome.stored.map(({ id, returnPercent }) => ({ id, returnPercent })));
      // Inspect the actual report using isolated engine-generated fixtures, never production balances/history.
      await preparePage(page, { stubRuntimeEnv: true });
      await page.addInitScript(() => {
        localStorage.setItem('dexSettings.theme', 'light');
        Object.defineProperty(screen, 'orientation', {
          configurable: true,
          value: {
            get type() {
              return innerWidth > innerHeight ? 'landscape-primary' : 'portrait-primary';
            },
            addEventListener() {},
            removeEventListener() {},
          },
        });
      });
      await page.goto(`${ipfsEntryUrl}#/bots`);
      await ensureAppLoaded(page);
      await page.getByTestId('bots-advanced').click();
      await expect(page.getByTestId('strategy-lab-tab')).toHaveAttribute('aria-current', 'page');
      await expect(page.getByTestId('strategy-lab')).toBeVisible();
      await expect(page.getByTestId('lab-run-batch')).toContainText('Run results again');
      await expect(page.getByTestId('lab-run-batch')).toBeVisible();
      // Completed evidence stays visible; setup and assistant help may use disclosures.
      await expect(page.getByTestId('lab-decisions').locator('details, summary')).toHaveCount(0);
      await expect(page.getByTestId('lab-more-analysis').locator('details, summary')).toHaveCount(0);
      await expect(page.getByTestId('experiment-show-flow')).toHaveCount(0);
      for (const card of await page.getByTestId('experiment-card').all()) {
        await expect(card.getByTestId('trade-distribution')).toBeVisible();
        await expect(card.getByTestId('distribution-explanation')).toBeVisible();
        await expect(card.getByTestId('distribution-gate-signal')).toBeVisible();
        await expect(card.locator('.experiment-trace')).toBeVisible();
      }
      await page.getByTestId('lab-comparison-scope').selectOption('all');
      await page.getByRole('button', { name: 'Fixture mixed rules', exact: true }).click();
      const report = page.getByTestId('validation-report');
      await expect(report.getByRole('heading', { name: 'Historical validation', exact: true })).toBeVisible();
      await expect(report.getByTestId('validation-timeline')).toBeVisible();
      await expect(report.getByTestId('validation-dates-1')).toContainText('UTC');
      await expect(report.locator('tbody tr')).toHaveCount(3);
      await expect(report.getByTestId('validation-fold-1')).toBeVisible();
      await expect(report.getByTestId('validation-details')).toBeVisible();
      await expect(report.getByTestId('validation-walkthrough-toggle')).toHaveCount(0);
      await expect(report.locator('[data-testid^="validation-cursor-"]')).toHaveCount(0);
      await expect(report.locator('progress')).toHaveCount(0);
      await report.screenshot({ path: test.info().outputPath(`validation-${browserName}-light.png`) });
      await page.locator('.app-header-menu .header-menu__button').first().click();
      await page.locator('.header-menu [data-test-name="noir"]').click();
      await page.keyboard.press('Escape');
      await expect(page.locator('html')).toHaveAttribute('design-system-theme', 'dark');
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(report.getByTestId('validation-dates-1')).toBeVisible();
      await expect(report.getByTestId('validation-fold-1')).toBeVisible();
      await report.screenshot({ path: test.info().outputPath(`validation-${browserName}-dark-mobile.png`) });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
