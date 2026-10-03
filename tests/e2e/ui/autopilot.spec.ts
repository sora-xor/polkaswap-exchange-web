import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { compileScript, compileStyleAsync, parse } from '@vue/compiler-sfc';
import { expect, test, type Page } from '@playwright/test';

const fixturePath = '/autopilot-isolated-test';
const exactCapital = '12.123456789012345678';
const fixtureAddress = 'cnQZc9h1R4Yt7v2P8w6m3a5L0b1S9x4D7e2F8g6H3j5K1n9M';
let fixtureBundle = '';
let fixtureCss = '';

interface FixtureSnapshot {
  connections: number;
  catalogs: number;
  selectedModels: string[];
  suggestions: number;
  histories: number;
  fees: number;
  researches: number;
  prepares: number;
  fundingReads: number;
  saves: number;
  starts: number;
  startOptions: Array<{ password: string; expectedConnection?: string }>;
  unlocks: number;
  pauses: number;
  stops: number;
  capital: string;
  inputAssetAddress: string;
  outputAssetAddress: string;
  valuationAsset: string;
  goalTitle: string;
  walletRequests: number;
  walletConnections: number;
  walletConnected: boolean;
  awaitingWallet: boolean;
  stage: string;
  preparedSlowWindow: number;
  desktopConnecting: boolean;
  desktopConnected: boolean;
}
interface DesktopStatus {
  connectionId: string;
  connected: boolean;
  state: 'awaiting_connection' | 'awaiting_budget' | 'awaiting_draft';
  requestId?: string;
}
interface PublicTrainingContext {
  requestId: string;
  trainingCutoff: number;
  candles: Array<{ timestamp: number; close: string }>;
  assets: Array<{ address: string }>;
  constraints: { maxTradeCodec: Record<string, string> };
  responseSchema: unknown;
}
interface FixtureTool {
  name: string;
  execute(input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
}
interface FixtureWindow extends Window {
  AutopilotFixture: {
    mount(): void;
    snapshot(): FixtureSnapshot;
    releaseCatalog(): void;
    releaseResearch(): void;
    releaseWallet(): void;
    setFunding(value: boolean): void;
    setExternal(value: boolean): void;
    rejectOpening(): void;
    rejectTrainingExecution(): void;
    useKusdMarket(): void;
    unmount(): void;
  };
  fixtureKeyInput?: HTMLInputElement;
  fixturePasswordInput?: HTMLInputElement;
  fixtureTools: Map<string, FixtureTool>;
}

/** Compile production presentation and orchestration; injected services never access providers, wallets or RPC. */
test.beforeAll(async () => {
  const styles: string[] = [];
  const bundle = await build({
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    globalName: 'AutopilotFixture',
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
        name: 'isolated-autopilot-services',
        setup(builder) {
          builder.onResolve({ filter: /^@\/composables\/useTranslation$/ }, () => ({
            path: 'translation',
            namespace: 'fixture',
          }));
          builder.onResolve({ filter: /^\.\/(ai|autopilot)$/ }, (args) => {
            if (!args.importer.endsWith('/useAutopilot.ts')) return;
            return { path: args.path.slice(2), namespace: 'fixture' };
          });
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: filename }) => ({
            contents:
              filename === 'translation'
                ? `import catalog from ${JSON.stringify(path.resolve('src/lang/en.json'))};
              export function useTranslation() { return { t(key, values = {}) {
                const message = key.split('.').reduce((entry, part) => entry?.[part], catalog);
                return typeof message === 'string' ? message.replace(/\\{(\\w+)\\}/g, (_, name) => String(values[name] ?? name)) : key;
              } }; }`
                : `export function ${filename === 'ai' ? 'createBotAiClient' : 'createAutopilotResearch'}() { throw new Error('Unmocked service forbidden'); }`,
            loader: 'ts',
            resolveDir: process.cwd(),
          }));
          builder.onLoad({ filter: /\.vue$/ }, async ({ path: filename }) => {
            const { descriptor, errors } = parse(await readFile(filename, 'utf8'), { filename });
            if (errors.length) throw errors[0];
            const scope = `data-v-fixture-${path.basename(filename, '.vue').toLowerCase()}`;
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
              styles.push(result.code);
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
      loader: 'ts',
      resolveDir: process.cwd(),
      contents: `
        import { createApp, h, ref } from 'vue';
        import BotAutopilot from './src/features/bot-trading/components/BotAutopilot.vue';
        import { useAutopilot } from './src/features/bot-trading/useAutopilot';
        import { createAutopilotOpeningError, createAutopilotQualificationError } from './src/features/bot-trading/autopilot-diagnostics';
        import { toCodec } from './src/features/bot-trading/amounts';
        import { XOR, VAL, KUSD } from './src/lib/substrate/sdk/assets/consts';
        import { useTranslation } from '@/composables/useTranslation';
        const clone = value => JSON.parse(JSON.stringify(value));
        const address = ${JSON.stringify(fixtureAddress)};
        const assets = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
        const bots = ref([]), walletConnected = ref(false), externalWallet = ref(false), active = ref([]);
        const identity = ref('fixture-wallet-network');
        const stats = { connections:0, catalogs:0, selectedModels:[], suggestions:0, histories:0, fees:0,
          researches:0, prepares:0, fundingReads:0, saves:0, starts:0, startOptions:[], unlocks:0, pauses:0, stops:0,
          capital:'', inputAssetAddress:'', outputAssetAddress:'', valuationAsset:'', goalTitle:'', walletRequests:0, walletConnections:0, preparedSlowWindow:0 };
        let app, flow, reviewed, funded = true, catalogRelease, researchRelease, openingRejected = false, trainingExecutionRejected = false;
        const training = Array.from({length: 100}, (_, i) => ({ timestamp: 1000 + i * 3600000, close:'2' }));
        const holdout = Array.from({length: 40}, (_, i) => ({ timestamp: 1000 + (100+i) * 3600000, close:'999999.123456789' }));
        const loadHistory = async () => { stats.histories++; return { candles:[...training,...holdout], denominationVerified:true, missing:0 }; };
        const loadFees = async () => { stats.fees++; return { networkFeeXor:'0.001', swapFeePercent:'0.1' }; };
        function template(input) {
          const inputAsset=assets.find(asset=>asset.address===input.assetInAddress), outputAsset=assets.find(asset=>asset.address===input.assetOutAddress);
          const capital = toCodec(input.capital, inputAsset.decimals), fee = toCodec(input.feeBudgetXor, XOR.decimals);
          const initial = { [inputAsset.address]:capital, [outputAsset.address]:'0' };
          return { version:1, id:'fixture-goal', name:input.title, mode:'paper', status:'idle', account:'paper', network:'paper',
            assetIn:{...inputAsset,balance:'PRIVATE_ASSET_BALANCE'}, assetOut:outputAsset, strategy:{ kind:'sma', amount:input.capital, intervalMs:3600000, threshold:'0', direction:'below', fastWindow:5, slowWindow:20, signalTiming:'closed-hour', prompt:'Draft a bounded strategy for the training observations only.' },
            policy:{ maxTradeCodec:{[inputAsset.address]:capital,[outputAsset.address]:capital}, slippagePercent:'0.5', maxPriceImpactPercent:'3', feeAsset:assets[0], feeBudgetCodec:fee, sessionDurationMs:86400000 },
            portfolio:{initial,holdings:clone(initial),feesPaidCodec:'0',trades:0}, state:{lastEvaluatedAt:0,lastTradeAt:0},
            provider:'openai',model:'',endpoint:'https://private-endpoint.example/secret',privateKey:'PRIVATE_PROVIDER_KEY',createdAt:Date.now(),sessionExpiresAt:0,activity:[],equity:[],apiUsage:{inputTokens:0,outputTokens:0,requests:0},
            goal:{title:input.title,targetReturnPercent:input.targetReturnPercent,maxLossPercent:input.maxLossPercent,durationMs:86400000,valuationAsset:input.valuationAsset} };
        }
        const trading = {
          assets:ref(assets), bots, walletConnected, externalWallet, connectionIdentity:identity, sessionActiveIds:active,
          readConnectionIdentity:()=>identity.value,
          // Match the four-field chain identity consumed by the holdout exposure guard.
          readNetworkIdentity:()=> JSON.stringify([true,'fixture-network',null,null]),
          async prepareLiveBot(bot) { stats.prepares++; stats.preparedSlowWindow=bot.strategy.slowWindow; reviewed={...clone(bot),mode:'live',account:address,network:'fixture-network'}; return clone(reviewed); },
          async previewLiveFunding() { stats.fundingReads++; return { sufficient:funded, assets:assets.map(asset => ({asset,
            requiredCodec:reviewed.portfolio.initial[asset.address], availableCodec: funded ? reviewed.portfolio.initial[asset.address] : '0'})) }; },
          async saveLiveBot(bot) { stats.saves++; bots.value=[clone(bot)]; return bot.id; },
          discardLiveReview() {},
          async startBot(id, options) { stats.starts++; stats.startOptions.push(clone(options)); if(options.password === 'fixture-unlock-only') stats.unlocks++;
            const bot=bots.value.find(item=>item.id===id); bot.status='running'; bot.sessionExpiresAt=Date.now()+86400000; active.value=[id]; },
          async pauseBot(id) { stats.pauses++; bots.value.find(item=>item.id===id).status='paused'; active.value=[]; },
          async stopBot(id) { stats.stops++; bots.value.find(item=>item.id===id).status='stopped'; active.value=[]; },
        };
        function ai(_provider, connection) {
          stats.connections++;
          if(connection.apiKey !== 'fixture-provider-key') throw new Error('Fixture key required');
          return {
            async listModels() { stats.catalogs++; await new Promise(resolve=>{catalogRelease=resolve}); return [{id:'fixture-mini-2026',name:'Fixture model',createdAt:1}]; },
            selectModel(model) { stats.selectedModels.push(model); },
            async suggest(bot) { return {strategy:{...clone(bot.strategy),prompt:''},usage:{requests:1,inputTokens:1,outputTokens:1}}; },
            disconnect() {},
          };
        }
        function research({onProgress}) { return {
          async run(input, client, signal) {
            stats.researches++; stats.capital=input.capital; stats.inputAssetAddress=input.assetInAddress;
            stats.outputAssetAddress=input.assetOutAddress; stats.valuationAsset=input.valuationAsset; stats.goalTitle=input.title;
            onProgress({phase:'history'}); await loadHistory(); const bot=template(input);
            if(openingRejected) throw createAutopilotOpeningError({
              lossPercent:'10.6972341206832258130349913977100777',maxLossPercent:input.maxLossPercent,
              valuationSymbol:bot.assetOut.symbol,openedAt:1789228800000,firstTradeAt:1789232400000
            });
            onProgress({phase:'drafting'}); stats.suggestions++; const draft=await client.suggest(bot,training,signal); bot.strategy=draft.strategy; await loadFees();
            onProgress({phase:'testing'});
            if(trainingExecutionRejected) throw createAutopilotQualificationError('training', [
              {candidate:1,reasons:['priceImpact','goalTradeCost']}
            ]);
            await new Promise((resolve,reject)=>{researchRelease=resolve;signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})});
            onProgress({phase:'ready'}); return {bot,research:{version:1,source:'historical'},denomination:{genesisHash:'fixture-network',denominator:'1'}};
          }, cancel() {}, dispose() {},
        }; }
        export function mount() {
          app=createApp({ setup() {
            const {t}=useTranslation(); flow=useAutopilot({trading,loadHistory,loadFees,ai,research,requestWallet:()=>{stats.walletRequests++;}});
            return ()=>h(BotAutopilot, {assets,bots:bots.value,walletConnected:walletConnected.value,walletAddress:walletConnected.value?address:'',externalWallet:externalWallet.value,
              stage:flow.stage.value,busy:flow.busy.value,awaitingWallet:flow.awaitingWallet.value,error:flow.error.value?t(flow.error.value):'',aiLabel:flow.aiLabel.value,
              diagnostics:flow.diagnostics.value,
              desktopSupported:flow.desktopSupported.value,desktopPending:flow.desktopPending.value,desktopMode:flow.desktopMode.value,
              desktopConnecting:flow.desktopConnecting.value,desktopConnected:flow.desktopConnected.value,
              desktopConnectionId:flow.desktopConnectionId.value,desktopContext:flow.desktopContext.value,
              desktopPrompt:flow.desktopPrompt?.value ?? '',desktopLink:flow.desktopLink?.value ?? '',
              progress:flow.progress.value?t(flow.progress.value):'',reviewBot:flow.reviewBot.value,funding:flow.funding.value,
              activeIds:active.value,selectedBot:flow.selectedBot.value,
              onBegin:flow.begin,onGo:flow.go,onConnect:flow.connect,onConnectDesktop:flow.connectDesktop,onWallet:()=>{stats.walletRequests++;},onResearch:flow.research,
              onDisconnectDesktop:flow.disconnectDesktop,onDesktopAcknowledge:flow.acknowledgeDesktop,onDesktopDraft:flow.submitDesktopDraft,
              onRefreshFunding:flow.refreshFunding,onStart:flow.start,onCancel:flow.cancel,onResume:flow.resume,
              onPause:trading.pauseBot,onStop:trading.stopBot,onAdvanced:()=>{}
            });
          }}); app.mount('#fixture');
        }
        export function snapshot(){return {...clone(stats),stage:flow.stage.value,awaitingWallet:flow.awaitingWallet.value,walletConnected:walletConnected.value,desktopConnecting:flow.desktopConnecting.value,desktopConnected:flow.desktopConnected.value};}
        export function releaseCatalog(){catalogRelease?.();}
        export function releaseResearch(){researchRelease?.();}
        export function releaseWallet(){stats.walletConnections++;walletConnected.value=true;}
        export function setFunding(value){funded=value;}
        export function setExternal(value){externalWallet.value=value;}
        export function rejectOpening(){openingRejected=true;}
        export function rejectTrainingExecution(){trainingExecutionRejected=true;}
        export function useKusdMarket(){const {address,symbol,decimals}=KUSD;assets.splice(1,1,{address,symbol,decimals});}
        export function unmount(){app.unmount();}
      `,
    },
  });
  fixtureBundle = bundle.outputFiles[0].text;
  fixtureCss = styles.join('\n');
});

/** Abort every nonfixture request so a regression cannot reach a real market, AI or wallet service. */
async function mount(page: Page, desktopSupported = false, kusdMarket = false): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).pathname === fixturePath
      ? route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Autopilot isolated fixtures</title><main id="fixture"></main>',
        })
      : route.abort('blockedbyclient')
  );
  await page.goto(fixturePath);
  if (desktopSupported)
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
  await page.addStyleTag({
    content: `*{box-sizing:border-box}body{margin:0;padding:16px;font:14px Arial,sans-serif;background:#faf9fa;color:#252329}
    #fixture{--s-color-base-content-primary:#252329;--s-color-base-content-secondary:#6f6875;--s-color-base-border-secondary:#ddd7dd;
    --s-color-action-text:#cb3271;--s-color-base-background:#fff;--s-color-base-background-hover:#fff6fa;--s-color-status-error:#b52239}
    ${fixtureCss}`,
  });
  await page.addScriptTag({ content: fixtureBundle });
  await page.evaluate((kusdMarket) => {
    const fixture = (window as unknown as FixtureWindow).AutopilotFixture;
    if (kusdMarket) fixture.useKusdMarket();
    fixture.mount();
  }, kusdMarket);
  await expect(page.getByTestId('autopilot-go')).toBeVisible();
  return errors;
}
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.snapshot());

/** Invoke only tools registered by the production desktop adapter; no actual desktop account or model is accessed. */
async function executeDesktopTool(page: Page, name: string, input: unknown = {}): Promise<unknown> {
  return page.evaluate(
    async ({ name, input }) => {
      const tool = (window as unknown as FixtureWindow).fixtureTools.get(name);
      if (!tool) throw new Error(`Missing fixture tool: ${name}`);
      return tool.execute(input);
    },
    { name, input }
  );
}

/** Submit the first-screen budget once; the wallet and AI steps must preserve it. */
async function submitGoal(page: Page, reverseMarket = false): Promise<{ assetIn: string; assetOut: string }> {
  await expect(page.locator('.autopilot-primary:visible')).toHaveCount(1);
  await expect(page.getByTestId('autopilot-go')).toHaveText('Find a strategy');
  await expect(page.getByTestId('autopilot-asset-in')).toBeVisible();
  await expect(page.getByTestId('autopilot-asset-out')).toBeVisible();
  await expect(page.getByTestId('autopilot-key')).toHaveCount(0);
  await page.getByTestId('autopilot-capital').fill(exactCapital);
  await page.getByTestId('autopilot-asset-in').selectOption({ label: reverseMarket ? 'VAL' : 'XOR' });
  await page.getByTestId('autopilot-asset-out').selectOption({ label: reverseMarket ? 'XOR' : 'VAL' });
  const assetIn = await page.getByTestId('autopilot-asset-in').inputValue();
  const assetOut = await page.getByTestId('autopilot-asset-out').inputValue();
  await expect(page.getByText('Token to maximize', { exact: true })).toBeVisible();
  await page.getByTestId('autopilot-go').click();
  await expect.poll(async () => (await snapshot(page)).awaitingWallet).toBe(true);
  expect(await snapshot(page)).toMatchObject({
    walletRequests: 1,
    walletConnections: 0,
    walletConnected: false,
    connections: 0,
    researches: 0,
    saves: 0,
    starts: 0,
    unlocks: 0,
  });
  return { assetIn, assetOut };
}

/** Resolve the mocked user wallet choice; no second GO may be required to reach the assistant. */
async function connectWallet(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.releaseWallet());
  await expect(page.getByTestId('autopilot-desktop-waiting')).toBeVisible();
  expect(await snapshot(page)).toMatchObject({
    walletRequests: 1,
    walletConnections: 1,
    walletConnected: true,
    awaitingWallet: false,
    researches: 0,
    saves: 0,
    starts: 0,
    unlocks: 0,
  });
}

/** Complete optional provider setup after GO; model discovery remains mocked. */
async function connect(page: Page): Promise<void> {
  await submitGoal(page);
  await connectWallet(page);
  await page.getByTestId('autopilot-use-api').click();
  await page.getByTestId('autopilot-key').fill('fixture-provider-key');
  await page.evaluate(() => {
    (window as unknown as FixtureWindow).fixtureKeyInput = document.querySelector(
      '[data-testid="autopilot-key"]'
    ) as HTMLInputElement;
  });
  await page.getByTestId('autopilot-connect').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureKeyInput?.value)).toBe('');
  expect((await snapshot(page)).starts).toBe(0);
  await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.releaseCatalog());
  await expect.poll(async () => (await snapshot(page)).stage).toBe('research');
}

/** Drive research through its visible automatic progress stage while confirming it cannot start trading. */
async function research(page: Page): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).stage).toBe('research');
  await expect(page.locator('.autopilot-research')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).suggestions).toBe(1);
  expect((await snapshot(page)).starts).toBe(0);
  expect((await snapshot(page)).saves).toBe(0);
  await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.releaseResearch());
  await expect(page.getByTestId('autopilot-review-form')).toBeVisible();
  await expect(page.locator('.autopilot-review-amount')).toContainText(exactCapital);
}

for (const browserName of ['chromium', 'webkit'] as const) {
  test.describe(`beginner autopilot ${browserName}`, () => {
    test('fits the KUSD budget row inside a production-width card at 320px without approval', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 780 } });
      const page = await context.newPage();
      try {
        const unexpectedRequests: string[] = [];
        page.on('request', (request) => {
          if (new URL(request.url()).pathname !== fixturePath) unexpectedRequests.push(request.url());
        });
        const errors = await mount(page, false, true);
        // Production card padding leaves 240px of content at the narrowest supported viewport.
        await page.addStyleTag({ content: '#fixture{max-width:240px;margin-inline:auto}' });
        await page.getByTestId('autopilot-capital').fill('10');
        await page.getByTestId('autopilot-asset-in').selectOption({ label: 'KUSD' });
        await page.getByTestId('autopilot-asset-out').selectOption({ label: 'XOR' });
        await expect(page.getByTestId('autopilot-capital')).toHaveValue('10');
        await expect(page.getByTestId('autopilot-asset-in').locator('option:checked')).toHaveText('KUSD');
        await expect(page.getByTestId('autopilot-asset-out').locator('option:checked')).toHaveText('XOR');
        const layout = await page.evaluate(() => {
          const amount = document.querySelector<HTMLInputElement>('[data-testid="autopilot-capital"]')!;
          const token = document.querySelector<HTMLSelectElement>('[data-testid="autopilot-asset-in"]')!;
          const style = getComputedStyle(token);
          const canvas = document.createElement('canvas').getContext('2d')!;
          canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const text = token.selectedOptions[0].text;
          const spacing = Number.parseFloat(style.letterSpacing) || 0;
          return {
            contentWidth: document.querySelector('#fixture')!.getBoundingClientRect().width,
            amountTop: amount.getBoundingClientRect().top,
            tokenTop: token.getBoundingClientRect().top,
            amountWidth: amount.getBoundingClientRect().width,
            tokenAvailableWidth:
              token.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight),
            tokenTextWidth: canvas.measureText(text).width + spacing * Math.max(0, text.length - 1),
          };
        });
        expect(layout.contentWidth).toBe(240);
        expect(Math.abs(layout.amountTop - layout.tokenTop)).toBeLessThanOrEqual(1);
        expect(layout.amountWidth).toBeGreaterThanOrEqual(110);
        expect(layout.tokenTextWidth).toBeLessThanOrEqual(layout.tokenAvailableWidth);
        for (const hidden of ['autopilot-password', 'autopilot-consent', 'autopilot-start', 'autopilot-review-form'])
          await expect(page.getByTestId(hidden)).toHaveCount(0);
        expect(await snapshot(page)).toMatchObject({
          histories: 0,
          researches: 0,
          walletRequests: 0,
          walletConnections: 0,
          prepares: 0,
          saves: 0,
          starts: 0,
          unlocks: 0,
          startOptions: [],
        });
        await page.evaluate(() => {
          const label = document.createElement('p');
          label.textContent = 'Synthetic UI fixture — no live trading';
          label.style.cssText = 'margin:0 0 12px;font-size:12px;font-weight:bold';
          document.body.prepend(label);
        });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath('synthetic-kusd-production-width-320.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await testInfo.attach('synthetic-budget-layout', {
          body: JSON.stringify(layout),
          contentType: 'application/json',
        });
        expect(unexpectedRequests).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('shows training execution-limit diagnostics without approving trading at 320px', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 780 } });
      const page = await context.newPage();
      try {
        const unexpectedRequests: string[] = [];
        page.on('request', (request) => {
          if (new URL(request.url()).pathname !== fixturePath) unexpectedRequests.push(request.url());
        });
        const errors = await mount(page, true);
        await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.rejectTrainingExecution());
        const market = await submitGoal(page, true);
        await connectWallet(page);
        await page.getByTestId('autopilot-connection-instructions').locator('summary').click();
        const prompt = await page.getByTestId('autopilot-desktop-prompt').inputValue();
        const connectionId = prompt.match(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i)?.[0];
        expect(connectionId).toBeTruthy();
        await executeDesktopTool(page, 'polkaswap_autopilot_connect', { connectionId });
        await expect.poll(async () => (await snapshot(page)).suggestions).toBe(1);
        const trainingContext = (await executeDesktopTool(
          page,
          'polkaswap_autopilot_context'
        )) as PublicTrainingContext;
        expect(trainingContext.assets.map((asset) => asset.address)).toEqual([market.assetIn, market.assetOut]);
        expect(trainingContext.constraints.maxTradeCodec[market.assetIn]).toBe('12123456789012345678');
        expect(
          await executeDesktopTool(page, 'polkaswap_autopilot_draft', {
            requestId: trainingContext.requestId,
            strategy: {
              kind: 'sma',
              amount: exactCapital,
              intervalMs: 3600000,
              threshold: '0',
              direction: 'below',
              fastWindow: 2,
              slowWindow: 3,
              prompt: '',
              rules: null,
              signalTiming: 'closed-hour',
            },
          })
        ).toEqual({ status: 'research_started', requiresTradingAuthorization: true });
        await expect(page.getByTestId('autopilot-error')).toHaveText('No strategy met your limits. Funds untouched.');
        const details = page.getByTestId('autopilot-diagnostics');
        await expect(details.locator('summary')).toHaveText('Why it stopped');
        await expect(details).not.toHaveAttribute('open', '');
        const reasons = details.locator('li');
        await expect(reasons).not.toBeVisible();
        const status = await executeDesktopTool(page, 'polkaswap_autopilot_status');
        expect(status).toEqual({
          connectionId,
          connected: true,
          state: 'research_failed',
          errorKey: 'bots.autopilot.errors.trainingRejected',
          diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: ['priceImpact', 'goalTradeCost'] }] },
        });
        expect(JSON.stringify(status)).not.toMatch(/PRIVATE_|private-endpoint|999999\.123456789/);
        expect(JSON.stringify(status)).not.toContain(fixtureAddress);
        await details.locator('summary').click();
        await expect(details).toContainText('Checks failed during strategy selection.');
        await expect(reasons).toHaveCount(1);
        await expect(reasons).toContainText('The price impact has exceeded the selected value');
        await expect(reasons).toContainText('Trade costs would exceed your remaining loss allowance.');
        await expect(reasons).not.toContainText('priceImpact');
        await expect(reasons).not.toContainText('goalTradeCost');
        await expect(page.getByTestId('autopilot-capital')).toHaveValue(exactCapital);
        await expect(page.getByTestId('autopilot-asset-in')).toHaveValue(market.assetIn);
        await expect(page.getByTestId('autopilot-asset-out')).toHaveValue(market.assetOut);
        for (const hidden of ['autopilot-password', 'autopilot-consent', 'autopilot-start', 'autopilot-review-form'])
          await expect(page.getByTestId(hidden)).toHaveCount(0);
        expect(await snapshot(page)).toMatchObject({
          stage: 'fund',
          desktopConnected: true,
          capital: exactCapital,
          inputAssetAddress: market.assetIn,
          outputAssetAddress: market.assetOut,
          valuationAsset: 'output',
          histories: 1,
          fees: 1,
          researches: 1,
          prepares: 0,
          saves: 0,
          starts: 0,
          unlocks: 0,
          startOptions: [],
        });
        // Label the artifact so this mocked regression cannot be mistaken for a live trading run.
        await page.evaluate(() => {
          const label = document.createElement('p');
          label.textContent = 'Synthetic UI fixture — no live trading';
          label.style.cssText = 'margin:0 0 12px;font-size:12px;font-weight:bold';
          document.body.prepend(label);
        });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath('synthetic-training-execution-diagnostics-320.png'),
          fullPage: true,
          animations: 'disabled',
        });
        expect(unexpectedRequests).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('explains an impossible opening before AI drafting and preserves the budget at 320px', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 780 } });
      const page = await context.newPage();
      try {
        const errors = await mount(page, true);
        await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.rejectOpening());
        const market = await submitGoal(page, true);
        await connectWallet(page);
        await page.getByTestId('autopilot-connection-instructions').locator('summary').click();
        const prompt = await page.getByTestId('autopilot-desktop-prompt').inputValue();
        const connectionId = prompt.match(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i)?.[0];
        expect(connectionId).toBeTruthy();
        await executeDesktopTool(page, 'polkaswap_autopilot_connect', { connectionId });
        await expect(page.getByTestId('autopilot-error')).toHaveText('This history cannot meet your loss limit.');
        const details = page.getByTestId('autopilot-diagnostics');
        await expect(details).not.toHaveAttribute('open', '');
        await details.locator('summary').click();
        await expect(page.getByTestId('autopilot-opening-bound')).toHaveText(
          'By the first possible trade, the starting allocation loses at least 10.69% of its value in XOR, exceeding your 5% limit—even with zero fees.'
        );
        await expect(page.getByTestId('autopilot-opening-dates')).toHaveText('2026-09-12 16:00 → 2026-09-12 17:00 UTC');
        await expect(page.getByTestId('autopilot-capital')).toHaveValue(exactCapital);
        await expect(page.getByTestId('autopilot-asset-in')).toHaveValue(market.assetIn);
        await expect(page.getByTestId('autopilot-asset-out')).toHaveValue(market.assetOut);
        for (const hidden of ['autopilot-password', 'autopilot-start', 'autopilot-key', 'autopilot-agent-context'])
          await expect(page.getByTestId(hidden)).toHaveCount(0);
        expect(await snapshot(page)).toMatchObject({
          stage: 'fund',
          desktopConnected: true,
          histories: 1,
          fees: 0,
          suggestions: 0,
          capital: exactCapital,
          valuationAsset: 'output',
          prepares: 0,
          saves: 0,
          starts: 0,
          unlocks: 0,
        });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('autopilot-opening-bound-320.png'), fullPage: true });
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    for (const transport of ['webmcp', 'browser-controls'] as const) {
      test(`connects through ${transport} without an API key and keeps the draft separate from signing`, async ({
        playwright,
        baseURL,
      }, testInfo) => {
        const browser = await playwright[browserName].launch();
        const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 780 } });
        const page = await context.newPage();
        try {
          const unexpectedRequests: string[] = [];
          page.on('request', (request) => {
            if (new URL(request.url()).pathname !== fixturePath) unexpectedRequests.push(request.url());
          });
          const nativeTools = transport === 'webmcp';
          const errors = await mount(page, nativeTools);
          const originalUrl = page.url();
          const market = await submitGoal(page, true);
          await connectWallet(page);
          await expect(page.getByTestId('autopilot-desktop-connect')).toBeVisible();
          await expect(page.getByTestId('autopilot-key')).toHaveCount(0);
          await expect(page.getByTestId('autopilot-desktop-waiting')).toBeVisible();
          await expect(page.getByTestId('autopilot-wallet')).toHaveCount(0);
          expect(await snapshot(page)).toMatchObject({
            connections: 0,
            catalogs: 0,
            starts: 0,
            unlocks: 0,
            stage: 'connect',
            desktopConnecting: true,
            desktopConnected: false,
          });
          const instructions = page.getByTestId('autopilot-connection-instructions');
          await instructions.locator('summary').click();
          const connectionPrompt = await page.getByTestId('autopilot-desktop-prompt').inputValue();
          const connectionId = connectionPrompt.match(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i)?.[0];
          expect(connectionId).toBeTruthy();
          expect(connectionPrompt).not.toContain('Use this page in the built-in browser');
          if (nativeTools) {
            await expect
              .poll(() => page.evaluate(() => [...(window as unknown as FixtureWindow).fixtureTools.keys()].sort()))
              .toEqual([
                'polkaswap_autopilot_connect',
                'polkaswap_autopilot_context',
                'polkaswap_autopilot_draft',
                'polkaswap_autopilot_status',
              ]);
            const status = (await executeDesktopTool(page, 'polkaswap_autopilot_status')) as DesktopStatus;
            expect(status).toEqual({ connectionId, connected: false, state: 'awaiting_connection' });
            expect((await snapshot(page)).desktopConnected).toBe(false);
            await expect(
              executeDesktopTool(page, 'polkaswap_autopilot_connect', {
                connectionId: '00000000-0000-0000-0000-000000000000',
              })
            ).rejects.toThrow();
            await expect(page.getByTestId('autopilot-wallet')).toHaveCount(0);
            expect(await executeDesktopTool(page, 'polkaswap_autopilot_connect', { connectionId })).toEqual({
              connectionId,
              connected: true,
              state: 'awaiting_budget',
            });
          } else {
            expect(
              await page.evaluate(() => ({
                documentRegistrar: 'modelContext' in document,
                navigatorRegistrar: 'modelContext' in navigator,
              }))
            ).toEqual({ documentRegistrar: false, navigatorRegistrar: false });
            await page.getByTestId('autopilot-assistant-controls').locator('summary').click();
            const connectionInput = page.getByTestId('autopilot-agent-connection-id');
            await connectionInput.fill('00000000-0000-0000-0000-000000000000');
            await page.getByTestId('autopilot-agent-acknowledge').click();
            await expect(page.getByTestId('autopilot-error')).toBeVisible();
            await expect(page.getByTestId('autopilot-wallet')).toHaveCount(0);
            expect((await snapshot(page)).desktopConnected).toBe(false);
            await connectionInput.fill(connectionId!);
            await page.getByTestId('autopilot-agent-acknowledge').click();
          }
          await expect.poll(async () => (await snapshot(page)).stage).toBe('research');
          await expect.poll(async () => (await snapshot(page)).researches).toBe(1);
          expect(await snapshot(page)).toMatchObject({
            desktopConnecting: false,
            desktopConnected: true,
            connections: 0,
            catalogs: 0,
            starts: 0,
            unlocks: 0,
            capital: exactCapital,
            inputAssetAddress: market.assetIn,
            outputAssetAddress: market.assetOut,
            valuationAsset: 'output',
            goalTitle: 'Maximize XOR',
            walletRequests: 1,
            walletConnections: 1,
          });
          await expect(page.getByTestId('autopilot-go')).toHaveCount(0);
          await page.getByTestId('autopilot-connection-instructions').locator('summary').click();
          const pendingPrompt = page.getByTestId('autopilot-desktop-prompt');
          await expect(pendingPrompt).toBeVisible();
          await expect(pendingPrompt).toHaveAttribute('readonly', '');
          await expect(pendingPrompt).toHaveValue(/polkaswap_autopilot_context/);
          await expect(page.getByTestId('autopilot-password')).toHaveCount(0);
          await expect(page.getByTestId('autopilot-start')).toHaveCount(0);
          expect(await snapshot(page)).toMatchObject({ suggestions: 1, prepares: 0, saves: 0, starts: 0 });
          let publicContext: PublicTrainingContext;
          if (nativeTools) {
            publicContext = (await executeDesktopTool(page, 'polkaswap_autopilot_context')) as PublicTrainingContext;
            expect(await executeDesktopTool(page, 'polkaswap_autopilot_status')).toEqual({
              connectionId,
              connected: true,
              state: 'awaiting_draft',
              requestId: publicContext.requestId,
            });
          } else {
            await page.getByTestId('autopilot-assistant-controls').locator('summary').click();
            const trainingInput = page.getByTestId('autopilot-agent-context');
            await expect(trainingInput).toHaveAttribute('readonly', '');
            await expect(trainingInput).not.toHaveValue('');
            let contextJson = await trainingInput.inputValue();
            const nextContextPage = page.getByTestId('autopilot-agent-context-next');
            while ((await nextContextPage.count()) && (await nextContextPage.isEnabled())) {
              const currentPage = await trainingInput.inputValue();
              await nextContextPage.click();
              await expect(trainingInput).not.toHaveValue(currentPage);
              contextJson += await trainingInput.inputValue();
            }
            publicContext = JSON.parse(contextJson) as PublicTrainingContext;
          }
          expect(publicContext.requestId).toBeTruthy();
          expect(publicContext.assets.map((asset) => asset.address)).toEqual([market.assetIn, market.assetOut]);
          expect(publicContext.candles).toHaveLength(100);
          expect(publicContext.trainingCutoff).toBe(1000 + 99 * 3600000);
          expect(
            publicContext.candles.every(
              (candle) => candle.timestamp <= publicContext.trainingCutoff && candle.close === '2'
            )
          ).toBe(true);
          expect(publicContext.constraints.maxTradeCodec[publicContext.assets[0].address]).toBe('12123456789012345678');
          expect(publicContext.responseSchema).toBeTruthy();
          expect(JSON.stringify(publicContext)).not.toMatch(
            /PRIVATE_ASSET_BALANCE|PRIVATE_PROVIDER_KEY|private-endpoint|999999\.123456789/
          );
          expect(JSON.stringify(publicContext)).not.toContain(fixtureAddress);
          expect(await pendingPrompt.inputValue()).not.toContain(fixtureAddress);
          await expect
            .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
            .toBe(true);
          await page.screenshot({
            path: testInfo.outputPath(`autopilot-${transport}-pending-320.png`),
            fullPage: true,
            animations: 'disabled',
          });
          const strategy = {
            kind: 'sma',
            amount: exactCapital,
            intervalMs: 3600000,
            threshold: '0',
            direction: 'below',
            fastWindow: 2,
            slowWindow: 3,
            prompt: '',
            rules: null,
            signalTiming: 'closed-hour',
          };
          if (nativeTools) {
            await expect(
              executeDesktopTool(page, 'polkaswap_autopilot_draft', { requestId: 'wrong-request', strategy })
            ).rejects.toThrow();
            expect((await snapshot(page)).prepares).toBe(0);
            expect(
              await executeDesktopTool(page, 'polkaswap_autopilot_draft', {
                requestId: publicContext.requestId,
                strategy,
              })
            ).toEqual({ status: 'research_started', requiresTradingAuthorization: true });
          } else {
            const draftInput = page.getByTestId('autopilot-agent-draft');
            await draftInput.fill(JSON.stringify({ requestId: 'wrong-request', strategy }));
            await page.getByTestId('autopilot-agent-submit').click();
            await expect(page.getByTestId('autopilot-error')).toBeVisible();
            expect(await snapshot(page)).toMatchObject({ prepares: 0, saves: 0, starts: 0, unlocks: 0 });
            await draftInput.fill(JSON.stringify({ requestId: publicContext.requestId, strategy }));
            await page.getByTestId('autopilot-agent-submit').click();
          }
          await expect.poll(async () => (await snapshot(page)).fees).toBe(1);
          await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.releaseResearch());
          await expect(page.getByTestId('autopilot-review-form')).toBeVisible();
          await expect(page.getByTestId('autopilot-start')).toBeDisabled();
          expect(await snapshot(page)).toMatchObject({
            prepares: 1,
            preparedSlowWindow: 3,
            saves: 0,
            starts: 0,
            connections: 0,
          });
          if (nativeTools)
            await expect(
              executeDesktopTool(page, 'polkaswap_autopilot_draft', { requestId: publicContext.requestId, strategy })
            ).rejects.toThrow();
          else await expect(page.getByTestId('autopilot-agent-submit')).toHaveCount(0);
          await page.getByTestId('autopilot-password').fill('fixture-unlock-only');
          await page.getByTestId('autopilot-consent').check();
          expect((await snapshot(page)).starts).toBe(0);
          await page.getByTestId('autopilot-start').click();
          await expect(page.getByTestId('autopilot-pause')).toBeVisible();
          expect(await snapshot(page)).toMatchObject({ starts: 1, unlocks: 1, saves: 1, connections: 0 });
          expect(page.url()).toBe(originalUrl);
          expect(context.pages()).toHaveLength(1);
          await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.unmount());
          if (nativeTools)
            await expect
              .poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureTools.size))
              .toBe(0);
          expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)])).toEqual([[], []]);
          expect(unexpectedRequests).toEqual([]);
          expect(errors).toEqual([]);
        } finally {
          await context.close();
          await browser.close();
        }
      });
    }

    test('connects, researches exact capital, unlocks once, and exposes pause and stop at 320px', async ({
      playwright,
      baseURL,
    }, testInfo) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 780 } });
      const page = await context.newPage();
      try {
        const errors = await mount(page);
        await page.screenshot({
          path: testInfo.outputPath('autopilot-welcome-320.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await connect(page);
        await research(page);
        await expect(page.getByTestId('autopilot-start')).toBeDisabled();
        const before = await snapshot(page);
        expect(before).toMatchObject({
          connections: 1,
          catalogs: 1,
          selectedModels: ['fixture-mini-2026'],
          histories: 1,
          fees: 1,
          researches: 1,
          prepares: 1,
          starts: 0,
          saves: 0,
          capital: exactCapital,
        });
        await expect(page.getByTestId('autopilot-funding')).toContainText(exactCapital);
        await expect(page.getByTestId('autopilot-fees-included')).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath('autopilot-review-320.png'),
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByTestId('autopilot-password').fill('fixture-unlock-only');
        await page.evaluate(() => {
          (window as unknown as FixtureWindow).fixturePasswordInput = document.querySelector(
            '[data-testid="autopilot-password"]'
          ) as HTMLInputElement;
        });
        await page.getByTestId('autopilot-consent').check();
        expect((await snapshot(page)).starts).toBe(0);
        await page.getByTestId('autopilot-start').click();
        await expect(page.getByTestId('autopilot-pause')).toBeVisible();
        expect(await snapshot(page)).toMatchObject({ starts: 1, unlocks: 1, saves: 1, stage: 'running' });
        expect(await page.evaluate(() => (window as unknown as FixtureWindow).fixturePasswordInput?.value)).toBe('');
        await page.getByTestId('autopilot-pause').click();
        await expect(page.getByTestId('autopilot-resume')).toBeVisible();
        await page.getByTestId('autopilot-stop').click();
        await expect(page.getByTestId('autopilot-stop')).toBeDisabled();
        expect(await snapshot(page)).toMatchObject({ starts: 1, unlocks: 1, pauses: 1, stops: 1 });
        expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)])).toEqual([[], []]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('shows the wallet deposit address for a shortfall and refreshes without signing', async ({
      playwright,
      baseURL,
    }) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 780 } });
      const page = await context.newPage();
      try {
        const errors = await mount(page);
        await connect(page);
        await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.setFunding(false));
        await research(page);
        await expect(page.getByTestId('autopilot-deposit')).toContainText(fixtureAddress);
        await expect(page.getByTestId('autopilot-password')).toHaveCount(0);
        await expect(page.getByTestId('autopilot-start')).toHaveCount(0);
        expect((await snapshot(page)).starts).toBe(0);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.setFunding(true));
        await page.getByTestId('autopilot-refresh').click();
        await expect(page.getByTestId('autopilot-password')).toBeVisible();
        await expect(page.getByTestId('autopilot-start')).toBeDisabled();
        expect(await snapshot(page)).toMatchObject({ fundingReads: 2, starts: 0, saves: 0 });
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });

    test('keeps an external wallet for research and starts only after consent without a password', async ({
      playwright,
      baseURL,
    }) => {
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      try {
        const errors = await mount(page);
        const originalUrl = page.url();
        await page.evaluate(() => (window as unknown as FixtureWindow).AutopilotFixture.setExternal(true));
        await connect(page);
        await expect(page.getByTestId('autopilot-switch-wallet')).toHaveCount(0);
        await research(page);
        await expect(page.getByTestId('autopilot-external-signing')).toHaveText(
          'Your external wallet will request a signature for each trade.'
        );
        await expect(page.getByTestId('autopilot-password')).toHaveCount(0);
        await expect(page.getByTestId('autopilot-consent')).not.toBeChecked();
        await expect(page.getByTestId('autopilot-start')).toBeDisabled();
        // A scripted form submission cannot skip the user's unchecked review consent.
        await page.getByTestId('autopilot-review-form').dispatchEvent('submit');
        expect(await snapshot(page)).toMatchObject({
          researches: 1,
          prepares: 1,
          saves: 0,
          starts: 0,
          unlocks: 0,
          startOptions: [],
        });
        await page.getByTestId('autopilot-consent').check();
        await expect(page.getByTestId('autopilot-start')).toBeEnabled();
        expect((await snapshot(page)).starts).toBe(0);
        await page.getByTestId('autopilot-start').click();
        await expect(page.getByTestId('autopilot-pause')).toBeVisible();
        expect(await snapshot(page)).toMatchObject({
          starts: 1,
          unlocks: 0,
          saves: 1,
          startOptions: [{ password: '', expectedConnection: 'fixture-wallet-network' }],
        });
        expect(page.url()).toBe(originalUrl);
        expect(context.pages()).toHaveLength(1);
        expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)])).toEqual([[], []]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });
  });
}
