import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { compileScript, compileStyleAsync, parse } from '@vue/compiler-sfc';
import { expect, test, type Page } from '@playwright/test';
import { CODEX_STRATEGY_LINK_MAX_LENGTH } from '@/features/bot-trading/codex-handoff';
import type { ComposedStrategy } from '@/features/bot-trading/strategy-composer';
import type { ResearchSettings } from '@/features/bot-trading/research';
import type { StrategyRules } from '@/features/bot-trading/strategy-rules';

/** This suite mounts production authoring code on a disposable page; all market observations are test fixtures. */
const fixturePath = '/codex-strategy-composer-test';
let composerBundle = '';
let composerCss = '';

interface FixtureTool {
  name: string;
  description: string;
  annotations?: Record<string, unknown>;
  execute(input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
}
interface ComposerFixture {
  mount(): void;
  unmount(): void;
  patchSettings(patch: Partial<ResearchSettings>): Promise<void>;
  setBusy(value: boolean): Promise<void>;
  deferHistory(): void;
  releaseHistory(): void;
  setHistoryFailure(value: boolean): void;
  snapshot(): { proposals: ComposedStrategy[]; historyRequests: number };
}
interface FixtureWindow extends Window {
  CodexComposerFixture: ComposerFixture;
  fixtureTools: Map<string, FixtureTool>;
  fixtureCodexLaunches: string[];
}

// Inline template compilation uses the real component and styles without importing the wallet shell or backend.
test.beforeAll(async () => {
  const css: string[] = [];
  const bundle = await build({
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    globalName: 'CodexComposerFixture',
    alias: {
      '@': path.resolve('src'),
      '@sora-substrate/math': path.resolve('src/lib/substrate/math/index.ts'),
      vue: path.resolve('node_modules/vue/dist/vue.runtime.esm-bundler.js'),
    },
    define: {
      'process.env.NODE_ENV': '"test"',
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    logLevel: 'silent',
    plugins: [
      {
        name: 'isolated-composer-fixture',
        setup(builder) {
          builder.onResolve({ filter: /^@\/composables\/useTranslation$/ }, () => ({
            path: 'fixture-translation',
            namespace: 'fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: `import catalog from ${JSON.stringify(path.resolve('src/lang/en.json'))};
              export function useTranslation() {
                return { t(key, values = {}) {
                  const message = key.split('.').reduce((entry, part) => entry?.[part], catalog);
                  return typeof message === 'string'
                    ? message.replace(/\\{(\\w+)\\}/g, (_, name) => String(values[name] ?? name)) : key;
                } };
              }`,
            loader: 'ts',
            resolveDir: process.cwd(),
          }));
          builder.onLoad({ filter: /\.vue$/ }, async ({ path: filename }) => {
            const { descriptor, errors } = parse(await readFile(filename, 'utf8'), { filename });
            if (errors.length) throw errors[0];
            const scope = 'data-v-codex-composer-fixture';
            const script = compileScript(descriptor, { id: scope, inlineTemplate: true, genDefaultAs: '__component' });
            for (const style of descriptor.styles) {
              const result = await compileStyleAsync({
                source: style.content,
                filename,
                id: scope,
                scoped: style.scoped,
                preprocessLang: style.lang === 'scss' ? 'scss' : undefined,
              });
              if (result.errors.length) throw result.errors[0];
              css.push(result.code);
            }
            return {
              contents: `${script.content}\n__component.__scopeId = '${scope}';\nexport default __component;`,
              loader: 'ts',
              resolveDir: path.dirname(filename),
            };
          });
        },
      },
    ],
    stdin: {
      resolveDir: process.cwd(),
      loader: 'ts',
      contents: `
        import { createApp, h, reactive, nextTick } from 'vue';
        import StrategyComposer from './src/features/bot-trading/components/StrategyComposer.vue';
        import { RESEARCH_DEFAULT_SETTINGS } from './src/features/bot-trading/research';
        import { XOR, VAL, PSWAP } from './src/lib/substrate/sdk/assets/consts';
        const assets = [XOR, VAL, PSWAP].map(({address, symbol, decimals}) => ({address, symbol, decimals}));
        const state = reactive({ settings: { ...RESEARCH_DEFAULT_SETTINGS,
          assetInAddress: PSWAP.address, assetOutAddress: VAL.address }, busy: false });
        const proposals = [];
        let app, historyRequests = 0, waiting = false, failHistory = false, release;
        function history() {
          const now = Date.now();
          return { denominationVerified: true, missing: 0,
            identity: { genesisHash: '0x' + 'b'.repeat(64), denominator: '1' },
            candles: Array.from({ length: 216 }, (_, index) => ({
              timestamp: now - (215 - index) * 3600000, close: index % 2 ? '2' : '3', feeClose: '1'
            })) };
        }
        async function loadHistory() {
          historyRequests++;
          if (waiting) await new Promise(resolve => { release = resolve; });
          if (failHistory) throw new Error('private fixture history failure');
          return history();
        }
        export function mount() {
          app = createApp({ render: () => h(StrategyComposer, {
            assets, settings: state.settings, busy: state.busy, loadHistory,
            onPropose: proposal => proposals.push(JSON.parse(JSON.stringify(proposal)))
          }) });
          app.mount('#fixture');
        }
        export function unmount() { app.unmount(); }
        export async function patchSettings(patch) { Object.assign(state.settings, patch); await nextTick(); }
        export async function setBusy(value) { state.busy = value; await nextTick(); }
        export function deferHistory() { waiting = true; }
        export function releaseHistory() { waiting = false; release?.(); }
        export function setHistoryFailure(value) { failHistory = value; }
        export function snapshot() { return { proposals, historyRequests }; }
      `,
    },
  });
  composerBundle = bundle.outputFiles[0].text;
  composerCss = css.join('\n');
  // Optional local smoke fixture uses the genuine browser registration surface; no polyfill is shipped here.
  const fixtureDirectory = process.env.PS_CODEX_FIXTURE_DIR;
  if (fixtureDirectory) {
    await mkdir(fixtureDirectory, { recursive: true });
    await Promise.all([
      writeFile(path.join(fixtureDirectory, 'composer-fixture.js'), composerBundle),
      writeFile(path.join(fixtureDirectory, 'composer-fixture.css'), composerCss),
      writeFile(
        path.join(fixtureDirectory, 'index.html'),
        `<!doctype html>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Polkaswap Codex authoring — isolated test fixtures</title>
        <link rel="stylesheet" href="./composer-fixture.css">
        <style>body{margin:20px;font:14px Arial,sans-serif;background:#f8f9fc;color:#1f2738}
          main{max-width:780px;margin:auto;--lab-text:#1f2738;--lab-muted:#5e6575;--lab-line:#cbd0da;
          --lab-bg:white;--lab-panel:#f8f9fc;--lab-cyan:#067b86;--lab-accent:#cf306c}
          .fixture-notice{max-width:780px;margin:0 auto 20px}</style>
        <p class="fixture-notice">Isolated test page. Prices are fabricated fixtures for testing authoring only.
          No wallet, bot runtime, backtest result, or trading service is connected.</p>
        <main id="fixture"></main>
        <script src="./composer-fixture.js"></script>
        <script>CodexComposerFixture.mount();</script>`
      ),
    ]);
  }
});

/** A test-only registrar runs the production execute handlers; it does not emulate Codex authentication. */
async function prepareComposer(page: Page, websiteTools = false): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).pathname === fixturePath)
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Codex authoring test fixtures</title><main id="fixture"></main>',
      });
    return route.abort('blockedbyclient');
  });
  await page.goto(fixturePath);
  // Record launch intent without opening the app handoff URL or creating a real Codex task.
  await page.evaluate(() => {
    (window as unknown as FixtureWindow).fixtureCodexLaunches = [];
    document.addEventListener('click', (event) => {
      const anchor = (event.target as Element).closest('a[data-testid="composer-open-codex"]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      event.preventDefault();
      (window as unknown as FixtureWindow).fixtureCodexLaunches.push(anchor.href);
    });
  });
  await page.addStyleTag({
    content: `* { box-sizing: border-box; } body { margin: 0; padding: 16px; font: 14px Arial, sans-serif; }
      #fixture { max-width: 780px; margin: auto; --lab-text: #1f2738; --lab-muted: #5e6575;
        --lab-line: #cbd0da; --lab-bg: #fff; --lab-panel: #f8f9fc; --lab-cyan: #067b86;
        --lab-accent: #cf306c; --s-color-focus-ring: #cf306c; --s-color-status-error-text: #b71936;
        --s-color-action-disabled-fill: #ddd; --s-color-on-action-disabled: #777;
        --s-shadow-element: 0 1px 3px #0002; }
      ${composerCss}`,
  });
  if (websiteTools)
    await page.evaluate(() => {
      const tools = new Map<string, FixtureTool>();
      (window as unknown as FixtureWindow).fixtureTools = tools;
      Object.defineProperty(document, 'modelContext', {
        configurable: true,
        value: {
          registerTool(tool: FixtureTool, options?: { signal?: AbortSignal }) {
            tools.set(tool.name, tool);
            options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true });
          },
          unregisterTool(name: string) {
            tools.delete(name);
          },
        },
      });
    });
  await page.addScriptTag({ content: composerBundle });
  await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.mount());
  await expect(page.getByTestId('strategy-composer')).toBeVisible();
  return errors;
}

/** Invoke the exact registered handler, as a website-tools client would, without reaching an AI provider. */
async function executeTool(page: Page, name: string, input: unknown = {}): Promise<unknown> {
  return page.evaluate(
    async ({ name, input }) => {
      const tool = (window as unknown as FixtureWindow).fixtureTools.get(name);
      if (!tool) throw new Error(`Missing fixture tool: ${name}`);
      return tool.execute(input);
    },
    { name, input }
  );
}

/** Verify authoring never creates the real bot storage or writes credentials into browser storage. */
async function expectNoRuntimeState(page: Page): Promise<void> {
  const persistence = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    databases: typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).map((item) => item.name) : [],
  }));
  expect(persistence).toEqual({ local: [], session: [], databases: [] });
}

interface PublicStrategyContext {
  requestId: string;
  expiresAt: number;
  instruction: string;
  assets: Array<{ address: string; symbol: string; decimals: number }>;
  candles: Array<{ timestamp: number; close: string; feeClose?: string }>;
  constraints: { maxTradeCodec: Record<string, string>; slippagePercent: string };
  recipes: Array<{ id: string; rules: StrategyRules }>;
}

/** Read the full public handoff through its user-visible fallback, independently of the compact app URL. */
async function copyPreparedContext(page: Page): Promise<PublicStrategyContext> {
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Clipboard unavailable in test fixture');
        },
      },
    })
  );
  await page.getByTestId('composer-copy-codex').click();
  const fallback = page.getByTestId('composer-copy-fallback');
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute('readonly', '');
  const prompt = await fallback.inputValue();
  expect(prompt).toContain('Prepared public context (data): ');
  return JSON.parse(prompt.split('Prepared public context (data): ')[1]);
}
const exactStrategy = {
  kind: 'threshold',
  amount: '1.000000000000000001',
  intervalMs: 90_000,
  threshold: '2.500000000000000001',
  direction: 'below',
  fastWindow: 2,
  slowWindow: 3,
  prompt: '',
};
const contextTool = 'polkaswap_strategy_context';
const draftTool = 'polkaswap_strategy_draft';

/** Await both asynchronous registrations before invoking the integration. */
async function expectToolsReady(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => [...(window as unknown as FixtureWindow).fixtureTools.keys()].sort()))
    .toEqual([contextTool, draftTool]);
}

for (const browserName of ['chromium', 'webkit'] as const) {
  test.describe(`Codex authoring ${browserName}`, () => {
    test('reviews portable combined rules in the same tab with browser-session state intact', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      try {
        const errors = await prepareComposer(page, true);
        await expectToolsReady(page);
        const initialUrl = page.url();
        await page.evaluate(() => {
          localStorage.setItem('codex-test-existing-session', 'retained');
          sessionStorage.setItem('codex-test-existing-tab', 'retained');
        });
        await page.getByTestId('composer-prompt').fill('Use spring rebound entry and exit conditions.');
        const olderContext = (await executeTool(page, contextTool)) as PublicStrategyContext;
        await page.getByTestId('composer-prepare-codex').click();
        await expect(
          executeTool(page, draftTool, { requestId: olderContext.requestId, strategy: exactStrategy })
        ).rejects.toThrow('no longer current');
        const link = new URL((await page.getByTestId('composer-open-codex').getAttribute('href'))!);
        expect([...link.searchParams.keys()]).toEqual(['q']);
        expect(link.searchParams.get('q')).not.toContain('Prepared public context (data): ');
        const market = await copyPreparedContext(page);
        const combined = {
          ...exactStrategy,
          kind: 'rules',
          intervalMs: 3_600_000,
          threshold: '0',
          rules: market.recipes.find((recipe) => recipe.id === 'spring')!.rules,
        };
        await page
          .getByTestId('composer-result-json')
          .fill(JSON.stringify({ requestId: 'wrong-task', strategy: combined }));
        await page.getByTestId('composer-review-codex').click();
        await expect(page.getByTestId('composer-error')).toContainText('does not match');
        await page
          .getByTestId('composer-result-json')
          .fill(JSON.stringify({ requestId: market.requestId, strategy: combined }));
        await page.getByTestId('composer-review-codex').click();
        await expect(page.getByTestId('composer-rule')).toHaveValue('rules');
        await expect(page.getByTestId('rule-group-entry')).toBeVisible();
        await expect(page.getByTestId('rule-group-exit')).toBeVisible();
        await expect(page.getByTestId('rule-threshold-exit-1')).toHaveValue('-8');
        expect(
          await page.getByTestId('rule-threshold-exit-1').evaluate((element) => element.getBoundingClientRect().width)
        ).toBeGreaterThan(100);
        await expect(page.getByTestId('composer-name')).not.toHaveValue(/bots\./);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        expect(
          (await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).proposals
        ).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath('codex-portable-rules-mobile.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByTestId('composer-apply').click();
        expect(
          (await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).proposals[0]
            .strategy
        ).toEqual(combined);
        expect(page.url()).toBe(initialUrl);
        expect(context.pages()).toHaveLength(1);
        expect(
          await page.evaluate(() => [
            localStorage.getItem('codex-test-existing-session'),
            sessionStorage.getItem('codex-test-existing-tab'),
          ])
        ).toEqual(['retained', 'retained']);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('discovers late navigator site tools without moving or reloading the active tab', async ({
      playwright,
      baseURL,
    }) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        const errors = await prepareComposer(page);
        await page.getByTestId('composer-prompt').fill('Keep this idea while browser support arrives.');
        await page.evaluate(() => {
          const tools = new Map<string, FixtureTool>();
          (window as unknown as FixtureWindow).fixtureTools = tools;
          Object.defineProperty(navigator, 'modelContext', {
            configurable: true,
            value: {
              registerTool(tool: FixtureTool) {
                tools.set(tool.name, tool);
              },
              unregisterTool(name: string) {
                tools.delete(name);
              },
            },
          });
        });
        await expectToolsReady(page);
        await expect(page.getByTestId('composer-prompt')).toHaveValue('Keep this idea while browser support arrives.');
        await expect(page.getByTestId('composer-codex-status')).toContainText('site tools');
        await page.getByTestId('composer-stop-codex').click();
        await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureTools.size)).toBe(0);
        await expect(page.getByTestId('composer-prepare-codex')).toBeEnabled();
        await page.getByTestId('composer-prepare-codex').click();
        const manualContext = await copyPreparedContext(page);
        await page
          .getByTestId('composer-result-json')
          .fill(JSON.stringify({ requestId: manualContext.requestId, strategy: exactStrategy }));
        await page.getByTestId('composer-review-codex').click();
        await expect(page.getByTestId('composer-review')).toBeVisible();
        expect(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureTools.size)).toBe(0);
        expect(
          (await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).proposals
        ).toEqual([]);
        await page.getByTestId('composer-retry-codex').click();
        await expectToolsReady(page);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('starts with account-based onboarding, a safe portable handoff, and usable mobile controls', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 1100, height: 900 } });
      const page = await context.newPage();
      try {
        const errors = await prepareComposer(page);
        await expect(page.getByTestId('composer-mode-api')).toHaveAttribute('aria-pressed', 'false');
        await expect(page.getByTestId('composer-codex')).toBeVisible();
        await expect(page.getByTestId('composer-key')).toHaveCount(0);
        await expect(page.getByTestId('composer-provider')).toHaveCount(0);
        await expect(page.getByTestId('composer-generate')).toHaveCount(0);
        await expect(page.getByTestId('composer-stop-codex')).toHaveCount(0);
        await expect(page.getByTestId('composer-retry-codex')).toBeVisible();
        await expect(page.getByTestId('composer-open-codex')).toBeVisible();
        await expect(page.getByTestId('composer-open-codex')).toHaveAttribute(
          'href',
          /^https:\/\/chatgpt\.com\/codex\/open-app\?q=/
        );
        await expect(page.getByTestId('composer-open-codex')).toHaveAttribute('target', '_blank');
        await expect(page.getByTestId('composer-open-codex')).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(page.getByTestId('composer-prepare-codex')).toBeDisabled();
        const initialUrl = page.url();
        await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.setHistoryFailure(true));
        const initialLink = await page.getByTestId('composer-open-codex').getAttribute('href');
        await page.getByTestId('composer-open-codex').click();
        expect(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureCodexLaunches)).toEqual([
          initialLink,
        ]);
        expect(await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).toEqual(
          { proposals: [], historyRequests: 0 }
        );
        expect(page.url()).toBe(initialUrl);
        expect(context.pages()).toHaveLength(1);
        await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.setHistoryFailure(false));
        const instruction = 'Buy PSWAP-priced VAL below 2.5 with one unit per 15 blocks.';
        await page.getByTestId('composer-prompt').fill(instruction);
        await page.getByTestId('composer-prepare-codex').click();
        await expect(page.getByTestId('composer-task-status')).toContainText('Task ready');
        const handoff = new URL((await page.getByTestId('composer-open-codex').getAttribute('href'))!);
        expect(handoff.protocol).toBe('https:');
        expect(handoff.hostname).toBe('chatgpt.com');
        expect(handoff.pathname).toBe('/codex/open-app');
        expect(handoff.searchParams.get('q')).toContain(instruction);
        expect(handoff.searchParams.get('q')).toContain('PSWAP');
        expect(handoff.searchParams.has('browserUrl')).toBe(false);
        expect(handoff.searchParams.get('q')).not.toContain('Prepared public context (data): ');
        expect(handoff.href.length).toBeLessThanOrEqual(CODEX_STRATEGY_LINK_MAX_LENGTH);
        const portable = await copyPreparedContext(page);
        expect(portable.candles).toHaveLength(202);
        expect(portable.recipes).toHaveLength(9);
        expect(portable.instruction).toBe(instruction);
        await expect(page.getByTestId('composer-copy-fallback')).not.toHaveValue(handoff.searchParams.get('q')!);
        expect(await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).toEqual(
          { proposals: [], historyRequests: 1 }
        );
        await page.screenshot({
          path: testInfo.outputPath('codex-onboarding-desktop.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await page.setViewportSize({ width: 320, height: 740 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.getByTestId('composer-open-codex')).toBeVisible();
        await expect(page.getByTestId('composer-copy-codex')).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath('codex-onboarding-mobile.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByTestId('composer-mode-api').click();
        await expect(page.getByTestId('composer-key')).toBeVisible();
        await page.getByTestId('composer-key').fill('unsubmitted-test-key');
        await page.getByTestId('composer-open-codex').click();
        await expect(page.getByTestId('composer-key')).toHaveCount(0);
        expect(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureCodexLaunches)).toHaveLength(2);
        expect(page.url()).toBe(initialUrl);
        await page.getByTestId('composer-mode-api').click();
        await expect(page.getByTestId('composer-key')).toHaveValue('');
        await expectNoRuntimeState(page);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('website tools stage an exact editable rule and only explicit review emits an experiment', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        const errors = await prepareComposer(page, true);
        await expectToolsReady(page);
        await page.getByTestId('composer-prompt').fill('Buy VAL below 2.5 PSWAP at most every 15 blocks.');
        await expect(page.getByTestId('composer-open-codex')).toBeVisible();
        await expect(page.getByTestId('composer-copy-codex')).toHaveCount(0);
        const market = (await executeTool(page, contextTool)) as PublicStrategyContext;
        expect(market.assets.map((asset) => asset.symbol)).toEqual(['PSWAP', 'VAL']);
        expect(market.candles).toHaveLength(202);
        expect(Object.keys(market).sort()).toEqual([
          'assets',
          'candles',
          'conditionSemantics',
          'constraints',
          'expiresAt',
          'instruction',
          'priceConvention',
          'recipes',
          'requestId',
          'researchPreferences',
          'responseSchema',
          'rules',
          'selectedPreset',
          'selectedStrategy',
        ]);
        expect(market.constraints.maxTradeCodec[market.assets[0].address]).toBe('10000000000000000000');
        expect(await executeTool(page, draftTool, { requestId: market.requestId, strategy: exactStrategy })).toEqual({
          status: 'draft_ready',
          requiresUserReview: true,
        });
        await expect(page.getByTestId('composer-review')).toBeVisible();
        await expect(page.getByTestId('composer-amount')).toHaveValue(exactStrategy.amount);
        await expect(page.getByTestId('composer-threshold')).toHaveValue(exactStrategy.threshold);
        await expect(page.getByTestId('composer-interval-blocks')).toHaveValue('15');
        expect(
          (await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).proposals
        ).toEqual([]);
        await expectNoRuntimeState(page);
        await executeTool(page, contextTool);
        await expect(page.getByTestId('composer-amount')).toHaveValue(exactStrategy.amount);
        await page.getByTestId('composer-name').fill('Reviewed precise threshold');
        await page.getByTestId('composer-amount').fill('2.000000000000000003');
        await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.setBusy(true));
        await expect(page.getByTestId('composer-apply')).toBeDisabled();
        await page.setViewportSize({ width: 390, height: 844 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath('codex-review-mobile.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.setBusy(false));
        await page.getByTestId('composer-apply').click();
        const state = await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot());
        expect(state.proposals).toHaveLength(1);
        expect(state.proposals[0]).toMatchObject({
          name: 'Reviewed precise threshold',
          strategy: { ...exactStrategy, amount: '2.000000000000000003' },
          settings: {
            assetInAddress: market.assets[0].address,
            assetOutAddress: market.assets[1].address,
            preset: 'threshold',
            optimize: false,
          },
        });
        await expect(page.getByTestId('composer-review')).toHaveCount(0);
        await expect(page.getByTestId('composer-added')).toBeVisible();
        await expectNoRuntimeState(page);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('rejects code, oversized and stale drafts and revokes tools on stop and unmount', async ({
      playwright,
      baseURL,
    }) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        const errors = await prepareComposer(page, true);
        await expectToolsReady(page);
        const market = (await executeTool(page, contextTool, {
          instruction: 'Buy dips using one deterministic threshold.',
        })) as PublicStrategyContext;
        for (const patch of [
          { kind: 'ai' },
          { amount: '10.000000000000000001' },
          { execute: 'window.privateSecret = true' },
          { amount: '1e-18' },
        ]) {
          await expect(
            executeTool(page, draftTool, { requestId: market.requestId, strategy: { ...exactStrategy, ...patch } })
          ).rejects.toThrow('no longer current');
          await expect(page.getByTestId('composer-review')).toHaveCount(0);
        }
        await page.evaluate(() =>
          (window as unknown as FixtureWindow).CodexComposerFixture.patchSettings({ capital: '50' })
        );
        await expect(
          executeTool(page, draftTool, { requestId: market.requestId, strategy: exactStrategy })
        ).rejects.toThrow('no longer current');
        const fresh = (await executeTool(page, contextTool, {
          instruction: 'Buy dips using one deterministic threshold.',
        })) as PublicStrategyContext;
        await executeTool(page, draftTool, { requestId: fresh.requestId, strategy: exactStrategy });
        await expect(
          executeTool(page, draftTool, { requestId: fresh.requestId, strategy: exactStrategy })
        ).rejects.toThrow('no longer current');
        await page.getByTestId('composer-stop-codex').click();
        await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureTools.size)).toBe(0);
        await expect(page.getByTestId('composer-review')).toHaveCount(0);
        await page.getByTestId('composer-retry-codex').click();
        await expectToolsReady(page);
        await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.unmount());
        await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureTools.size)).toBe(0);
        expect(
          (await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).proposals
        ).toEqual([]);
        await expectNoRuntimeState(page);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('fails closed for missing history and ignores a late context after the research controls change', async ({
      playwright,
      baseURL,
    }) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        const errors = await prepareComposer(page, true);
        await expectToolsReady(page);
        await page.getByTestId('composer-prompt').fill('Buy VAL on a dip.');
        await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.setHistoryFailure(true));
        await expect(executeTool(page, contextTool)).rejects.toThrow('no longer current');
        await expect(page.getByTestId('composer-error')).toBeVisible();
        await expect(page.getByTestId('composer-error')).not.toContainText('private fixture');
        await page.evaluate(() => {
          const fixture = (window as unknown as FixtureWindow).CodexComposerFixture;
          fixture.setHistoryFailure(false);
          fixture.deferHistory();
        });
        const pending = executeTool(page, contextTool).then(
          () => 'unexpected-success',
          () => 'stale-rejected'
        );
        await expect
          .poll(() =>
            page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot().historyRequests)
          )
          .toBe(2);
        await page.evaluate(async () => {
          const fixture = (window as unknown as FixtureWindow).CodexComposerFixture;
          await fixture.patchSettings({ tradePercent: 5 });
          fixture.releaseHistory();
        });
        expect(await pending).toBe('stale-rejected');
        await expect(page.getByTestId('composer-review')).toHaveCount(0);
        const current = (await executeTool(page, contextTool)) as PublicStrategyContext;
        await executeTool(page, draftTool, { requestId: current.requestId, strategy: exactStrategy });
        await expect(page.getByTestId('composer-review')).toBeVisible();
        expect(
          (await page.evaluate(() => (window as unknown as FixtureWindow).CodexComposerFixture.snapshot())).proposals
        ).toEqual([]);
        await expectNoRuntimeState(page);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });
  });
}
