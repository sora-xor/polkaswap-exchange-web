import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ensurePreviewServer } from './preview-server-helper.mjs';
import { resolveAppBaseUrl, resolveRouteUrl } from './url-helpers.mjs';

const base = process.cwd();
const RAW_BASE_URL = process.env.WALLET_MATRIX_BASE_URL || 'http://127.0.0.1:8896';
const BASE_URL = resolveAppBaseUrl(RAW_BASE_URL, process.env.WALLET_MATRIX_PREFIX);
const PASSWORD = process.env.WALLET_PASSWORD || 'Password123!';
const FRESH_MODE = process.env.WALLET_MATRIX_FRESH === '1';
const KEEP_FRESH_PROFILES = process.env.WALLET_MATRIX_KEEP_PROFILES === '1';
const USE_RUNTIME_PROFILE_COPIES = process.env.WALLET_MATRIX_RUNTIME_COPIES !== '0';
const PERSISTENT_CONTEXT_CHANNEL = process.env.WALLET_MATRIX_CHANNEL || 'chrome';
const LOCK_FILES = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
const PERSISTENT_CONTEXT_IGNORE_DEFAULT_ARGS = ['--disable-extensions', '--disable-component-extensions-with-background-pages'];
const ROUTES = (process.env.WALLET_MATRIX_ROUTES || '#/swap,#/bridge,#/burn,#/trade/DAI/KUSD,#/wallet,#/stats')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const PERSISTENT_CONTEXT_ARGS = [
  '--disable-crashpad',
  '--disable-extensions-except=%EXTENSION_PATH%',
  '--load-extension=%EXTENSION_PATH%',
  '--no-first-run',
  '--no-default-browser-check',
];

/**
 * Wallet matrix for local Playwright verification.
 * `cardName` must match the wallet card in the in-app connect modal.
 */
const WALLETS = [
  {
    key: 'polkadot-js',
    cardName: /Polkadot/i,
    providerKey: 'polkadot-js',
    password: 'Password123!',
    profile: '.playwright-cli/extensions/profiles/polkadot-js-2',
    extensionPath: '.playwright-cli/extensions/unpacked/polkadot-js',
  },
  {
    key: 'fearless-wallet',
    cardName: /Fearless/i,
    providerKey: 'fearless-wallet',
    password: 'Password123!',
    profile: '.playwright-cli/extensions/profiles/fearless-wallet-id',
    extensionPath: '.playwright-cli/extensions/unpacked/fearless-wallet',
  },
  {
    key: 'subwallet-js',
    cardName: /SubWallet|Subwallet/i,
    providerKey: 'subwallet-js',
    password: 'Password123!',
    profile: '.playwright-cli/extensions/profiles/subwallet-e2e1',
    extensionPath: '.playwright-cli/extensions/unpacked/subwallet-js',
  },
  {
    key: 'talisman',
    cardName: /Talisman/i,
    providerKey: 'talisman',
    password: 'Password123!',
    profile: '.playwright-cli/extensions/profiles/talisman-e2e2',
    extensionPath: '.playwright-cli/extensions/unpacked/talisman',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clickIf = async (page, pattern, waitMs = 120) => {
  const button = page.getByRole('button', { name: pattern }).first();
  if (!(await button.count().catch(() => 0))) return false;
  if (!(await button.isVisible().catch(() => false))) return false;
  if (await button.isDisabled().catch(() => true)) return false;
  await button.click().catch(() => {});
  await sleep(waitMs);
  return true;
};

const cleanProfileLocks = async (profilePath) => {
  for (const file of LOCK_FILES) {
    await fs.rm(path.join(profilePath, file), { force: true }).catch(() => {});
  }
};

const getExtensionOrigin = async (context) => {
  const deadline = Date.now() + 8_000;

  while (Date.now() < deadline) {
    const workerUrl = context
      .serviceWorkers()
      .map((worker) => worker.url())
      .find((url) => url.startsWith('chrome-extension://'));

    if (workerUrl) {
      const match = workerUrl.match(/^chrome-extension:\/\/[a-z]{32}/i);
      if (match) return match[0];
    }

    const pageUrl = context
      .pages()
      .map((page) => page.url())
      .find((url) => url.startsWith('chrome-extension://'));

    if (pageUrl) {
      const match = pageUrl.match(/^chrome-extension:\/\/[a-z]{32}/i);
      if (match) return match[0];
    }

    await sleep(120);
  }

  return '';
};

const waitForWalletModal = async (app, timeoutMs = 3_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await app.locator('.account-card').count().catch(() => 0)) > 0) return true;
    await sleep(120);
  }
  return false;
};

const openWalletModal = async (app) => {
  if ((await app.locator('.account-card').count().catch(() => 0)) > 0) return true;

  const connectButtons = app.getByRole('button', { name: /Connect account|Connect wallet/i });
  const count = await connectButtons.count().catch(() => 0);
  if (!count) return false;

  const targets = [];
  if (count > 1) targets.push(connectButtons.nth(1));
  targets.push(connectButtons.first());

  for (const target of targets) {
    if (!(await target.count().catch(() => 0))) continue;
    const visible = await target.isVisible().catch(() => false);
    const disabled = await target.isDisabled().catch(() => true);
    if (!visible || disabled) continue;
    await target.click().catch(() => {});
    if (await waitForWalletModal(app)) return true;
  }

  return false;
};

const selectWalletCard = async (app, cardName) => {
  const card = app.locator('.account-card').filter({ hasText: cardName }).first();
  if (!(await card.count().catch(() => 0))) return false;

  const label = card.locator('.account-credentials_name, .extension-name').first();
  if (await label.count().catch(() => 0)) {
    await label.click().catch(() => {});
  } else {
    await card.click().catch(() => {});
  }

  await sleep(700);
  return true;
};

const clickAppAccountRow = async (app) => {
  const rows = app.locator('.account-card');
  const count = await rows.count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const isWalletOption =
      /^Google$/i.test(text) ||
      /^WalletConnect$/i.test(text) ||
      /^Fearless Wallet(?:\s+RECOMMENDED)?$/i.test(text) ||
      /^Polkadot\{\.js\}(?:\s+INSTALL)?$/i.test(text) ||
      /^SubWallet(?:\s+INSTALL)?$/i.test(text) ||
      /^Talisman(?:\s+INSTALL)?$/i.test(text) ||
      /INSTALL|RECOMMENDED|Learn more/i.test(text);

    if (isWalletOption) continue;

    await row.click().catch(() => {});
    await sleep(180);
    return true;
  }

  return false;
};

const handleSubWalletAuth = async (page) => {
  if (!page.url().includes('popup=confirmations')) return;

  const row = page.locator('.__account-proxy-item, .AccountProxyItem-sc-ool1ed-0, .account-list > div').first();
  if (await row.count().catch(() => 0)) {
    await row.click({ force: true }).catch(() => {});
    await sleep(140);
  }

  await clickIf(page, /^Connect$/i, 180);
};

const handleTalismanAuth = async (page) => {
  if (!page.url().includes('/auth/auth')) return;

  const specificAccount = page.getByText(/Talisman QA/i).first();
  if (await specificAccount.count().catch(() => 0)) {
    await specificAccount.click({ force: true }).catch(() => {});
    await sleep(120);
  }

  await clickIf(page, /Connect All/i, 140);
  await clickIf(page, /^Connect\s*\d+$/i, 180);
  await clickIf(page, /^Connect$/i, 180);
};

const handleWalletPages = async (wallet, context, extensionOrigin) => {
  if (!extensionOrigin) return { talismanNeedsAccountSetup: false };

  const pages = context.pages().filter((page) => page.url().startsWith(extensionOrigin));
  let talismanNeedsAccountSetup = false;
  const walletPassword = wallet.password || PASSWORD;

  for (const page of pages) {
    const pwInputs = page.locator('input[type="password"]');
    const pwCount = await pwInputs.count().catch(() => 0);
    for (let i = 0; i < pwCount; i++) {
      const input = pwInputs.nth(i);
      const currentValue = await input.inputValue().catch(() => '');
      if (currentValue !== walletPassword) {
        await input.click({ force: true }).catch(() => {});
        await input.fill('').catch(() => {});
        await input.type(walletPassword, { delay: 25 }).catch(() => {});
      }
    }

    const checks = page.locator('input[type="checkbox"]');
    const checkCount = await checks.count().catch(() => 0);
    for (let i = 0; i < checkCount; i++) {
      const check = checks.nth(i);
      if (!(await check.isChecked().catch(() => false))) {
        await check.check({ force: true }).catch(() => {});
      }
    }

    // Shared wallet auth / onboarding actions.
    await clickIf(page, /Unlock/i);
    await clickIf(page, /Select all/i);
    await clickIf(page, /Yes, allow this application access/i);
    await clickIf(page, /Allow/i);
    await clickIf(page, /Approve/i);
    await clickIf(page, /Authorize/i);
    await clickIf(page, /Sign the message/i);
    await clickIf(page, /^Sign$/i);
    await clickIf(page, /^Accept$/i);
    await clickIf(page, /^Confirm$/i);
    await clickIf(page, /^Submit$/i);
    await clickIf(page, /^OK$/i);
    await clickIf(page, /Connect/i);
    await clickIf(page, /Done/i);
    await clickIf(page, /Continue/i);
    await clickIf(page, /Get Started/i);
    await clickIf(page, /I agree/i);
    await clickIf(page, /Enter Talisman/i);

    // Fresh-profile onboarding affordances.
    await clickIf(page, /Create a new wallet/i);
    await clickIf(page, /Create a new account/i);
    await clickIf(page, /Join EVM or Substrate/i);
    await clickIf(page, /I have written down the passphrase/i);
    await clickIf(page, /Skip confirmation/i);
    await clickIf(page, /Start using Fearless/i);
    await clickIf(page, /I have kept it somewhere safe/i);
    await clickIf(page, /Finish/i);

    if (wallet.key === 'subwallet-js') {
      await handleSubWalletAuth(page);
    }

    if (wallet.key === 'talisman') {
      await handleTalismanAuth(page);
      const text = await page
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim())
        .catch(() => '');
      if (/requires a Polkadot account to connect/i.test(text)) {
        talismanNeedsAccountSetup = true;
      }
    }
  }

  return { talismanNeedsAccountSetup };
};

const getAppState = async (app) => {
  return app
    .evaluate(() => ({
      source:
        globalThis.__PS_ACTIVE_PINIA__?.state?.value?.wallet?.accountState?.source ||
        window.__POLKASWAP_LEGACY_STORE__?.state?.wallet?.account?.source ||
        '',
      address:
        globalThis.__PS_ACTIVE_PINIA__?.state?.value?.wallet?.accountState?.address ||
        window.__POLKASWAP_LEGACY_STORE__?.state?.wallet?.account?.address ||
        '',
    }))
    .catch(() => ({ source: '', address: '' }));
};

const getDirectProviderState = async (app, providerKey, timeoutMs = 4_000) => {
  return app.evaluate(
    async ({ key, timeout }) => {
      const provider = window.injectedWeb3?.[key];
      if (!provider) return { missingProvider: true };

      try {
        const result = await Promise.race([
          (async () => {
            const ext = await provider.enable('Sora2 Wallet');
            const accounts = await ext.accounts.get();
            return {
              count: Array.isArray(accounts) ? accounts.length : 0,
              first: accounts?.[0]?.address || '',
              hasSigner: !!ext?.signer,
              hasSignRaw: typeof ext?.signer?.signRaw === 'function',
              hasSignPayload: typeof ext?.signer?.signPayload === 'function',
            };
          })(),
          new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), timeout)),
        ]);
        return result;
      } catch (error) {
        return { error: String(error?.message || error) };
      }
    },
    { key: providerKey, timeout: timeoutMs }
  );
};

const getSignatureState = async (app, providerKey, timeoutMs = 7_000) => {
  return app.evaluate(
    async ({ key, timeout }) => {
      const provider = window.injectedWeb3?.[key];
      if (!provider) return { canSign: false, reason: 'missing-provider' };

      try {
        const signResult = await Promise.race([
          (async () => {
            const ext = await provider.enable('Sora2 Wallet');
            const accounts = await ext.accounts.get();
            const address = accounts?.[0]?.address;
            const signer = ext?.signer;

            if (!address) return { canSign: false, reason: 'missing-account' };
            if (!signer) return { canSign: false, reason: 'missing-signer' };
            if (typeof signer.signRaw !== 'function') {
              return {
                canSign: false,
                reason: 'signRaw-unavailable',
                hasSignPayload: typeof signer.signPayload === 'function',
              };
            }

            const payloadText = `wallet-matrix:${Date.now()}`;
            const payloadHex = `0x${Array.from(new TextEncoder().encode(payloadText))
              .map((value) => value.toString(16).padStart(2, '0'))
              .join('')}`;

            const signature = await signer.signRaw({
              address,
              data: payloadHex,
              type: 'bytes',
            });

            return {
              canSign: !!signature?.signature,
              signaturePrefix: signature?.signature?.slice(0, 12) || '',
            };
          })(),
          new Promise((resolve) => setTimeout(() => resolve({ canSign: false, timeout: true }), timeout)),
        ]);

        return signResult;
      } catch (error) {
        return { canSign: false, error: String(error?.message || error) };
      }
    },
    { key: providerKey, timeout: timeoutMs }
  );
};

const hasAuthorizationError = (state) =>
  typeof state?.error === 'string' && /pending authorization request|has not been authorised/i.test(state.error);

const runTaskWithWalletAutomation = async ({
  wallet,
  context,
  extensionOrigin,
  resolveExtensionOrigin,
  task,
  onExtensionState,
  onTick,
  maxDurationMs = 20_000,
  intervalMs = 250,
}) => {
  let settled = false;
  let outcome = null;

  const taskPromise = Promise.resolve()
    .then(task)
    .then(
      (value) => {
        settled = true;
        outcome = { ok: true, value };
        return outcome;
      },
      (error) => {
        settled = true;
        outcome = { ok: false, error };
        return outcome;
      }
    );

  const deadline = Date.now() + maxDurationMs;
  while (!settled && Date.now() < deadline) {
    let activeExtensionOrigin = extensionOrigin;
    if (!activeExtensionOrigin && resolveExtensionOrigin) {
      activeExtensionOrigin = await resolveExtensionOrigin();
    }

    const extensionState = await handleWalletPages(wallet, context, activeExtensionOrigin);
    onExtensionState?.(extensionState);

    if (onTick) {
      await onTick();
    }

    const maybeDone = await Promise.race([taskPromise, sleep(intervalMs).then(() => null)]);
    if (maybeDone) break;
  }

  const finalOutcome = outcome ?? (await Promise.race([taskPromise, sleep(500).then(() => null)]));
  if (!finalOutcome) return { timeout: true };
  if (!finalOutcome.ok) return { error: String(finalOutcome.error?.message || finalOutcome.error) };
  return finalOutcome.value;
};

const seedPolkadotAuthForAppOrigin = async (context, extensionOrigin, routeUrl) => {
  if (!extensionOrigin) return;

  const appOrigin = new URL(routeUrl).origin;

  const page = await context.newPage();
  try {
    await page.goto(`${extensionOrigin}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});

    await page
      .evaluate(async ({ origin, route }) => {
        const parseAuth = (value) => {
          if (!value) return {};
          if (typeof value === 'string') {
            try {
              return JSON.parse(value) || {};
            } catch {
              return {};
            }
          }
          return value;
        };

        const current = await chrome.storage.local.get(null);
        const authUrls = parseAuth(current.authUrls);
        const addresses = Object.values(current)
          .filter((value) => value && typeof value === 'object' && typeof value.address === 'string')
          .map((value) => value.address);
        const uniqueAddresses = [...new Set(addresses)];

        authUrls[origin] = {
          authorizedAccounts: uniqueAddresses,
          count: 0,
          id: origin,
          origin: 'Polkaswap',
          url: route,
        };

        await chrome.storage.local.set({
          authUrls: JSON.stringify(authUrls || {}),
          defaultAuthAccounts: JSON.stringify(uniqueAddresses),
        });
      },
      { origin: appOrigin, route: routeUrl })
      .catch(() => {});
  } finally {
    await page.close().catch(() => {});
  }
};

const seedTalismanAuthForAppOrigin = async (context, extensionOrigin, routeUrl) => {
  if (!extensionOrigin) return;

  const appUrl = new URL(routeUrl);
  const siteId = appUrl.host;

  const page = await context.newPage();
  try {
    await page.goto(`${extensionOrigin}/popup.html`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});

    await page
      .evaluate(async ({ id, route }) => {
        const current = await chrome.storage.local.get(['accountsCatalog', 'sitesAuthorized']);
        const addresses = Array.isArray(current?.accountsCatalog?.portfolio)
          ? current.accountsCatalog.portfolio.map((item) => item?.address).filter(Boolean)
          : [];

        if (!addresses.length) return;

        const sitesAuthorized = current?.sitesAuthorized ?? {};
        sitesAuthorized[id] = {
          ...(sitesAuthorized[id] ?? {}),
          addresses,
          connectAllSubstrate: true,
          id,
          origin: 'Polkaswap',
          url: route,
        };

        await chrome.storage.local.set({ sitesAuthorized });
      },
      { id: siteId, route: routeUrl })
      .catch(() => {});
  } finally {
    await page.close().catch(() => {});
  }
};

const ensureProfilePath = async (wallet, freshProfilesRoot) => {
  const templatePath = path.join(base, wallet.profile);

  if (!USE_RUNTIME_PROFILE_COPIES && !FRESH_MODE) {
    return templatePath;
  }

  const profilePath = path.join(freshProfilesRoot, wallet.key);
  await fs.rm(profilePath, { recursive: true, force: true }).catch(() => {});
  await fs.cp(templatePath, profilePath, { recursive: true });

  return profilePath;
};

const runRouteWalletCheck = async (wallet, routeHash, profilePath) => {
  const routeUrl = resolveRouteUrl(RAW_BASE_URL, routeHash, process.env.WALLET_MATRIX_PREFIX);
  const extensionPath = path.join(base, wallet.extensionPath);

  await cleanProfileLocks(profilePath);

  let context;
  const result = {
    route: routeHash,
    wallet: wallet.key,
    storeSource: '',
    storeAddress: '',
    direct: null,
    signature: null,
    modalOpened: false,
    walletCardFound: false,
    selectedAccountInApp: false,
    talismanNeedsAccountSetup: false,
    signatureOptional: false,
    pass: false,
    error: '',
  };

  try {
    context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      channel: PERSISTENT_CONTEXT_CHANNEL,
      ignoreDefaultArgs: PERSISTENT_CONTEXT_IGNORE_DEFAULT_ARGS,
      args: PERSISTENT_CONTEXT_ARGS.map((arg) => arg.replaceAll('%EXTENSION_PATH%', extensionPath)),
      viewport: { width: 1366, height: 900 },
    });
    await context.addInitScript(() => {
      localStorage.setItem('dexSettings.disclaimerApprove', 'true');
    });

    let extensionOrigin = await getExtensionOrigin(context);
    if (wallet.key === 'polkadot-js') {
      await seedPolkadotAuthForAppOrigin(context, extensionOrigin, routeUrl);
    }
    if (wallet.key === 'talisman') {
      await seedTalismanAuthForAppOrigin(context, extensionOrigin, routeUrl);
    }

    const app = await context.newPage();
    await app.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(1_500);

    const currentState = await getAppState(app);
    if (!(currentState.source === wallet.providerKey && currentState.address)) {
      result.modalOpened = await openWalletModal(app);
      result.walletCardFound = await selectWalletCard(app, wallet.cardName);
      extensionOrigin ||= await getExtensionOrigin(context);

      const deadline = Date.now() + 35_000;
      while (Date.now() < deadline) {
        extensionOrigin ||= await getExtensionOrigin(context);
        const extensionState = await handleWalletPages(wallet, context, extensionOrigin);
        if (extensionState.talismanNeedsAccountSetup) {
          result.talismanNeedsAccountSetup = true;
        }

        const selected = await clickAppAccountRow(app);
        result.selectedAccountInApp = result.selectedAccountInApp || selected;

        const state = await getAppState(app);
        if (state.source || state.address) {
          result.storeSource = state.source;
          result.storeAddress = state.address;
          break;
        }

        await sleep(350);
      }
    }

    if (!result.storeSource || !result.storeAddress) {
      const state = await getAppState(app);
      result.storeSource = state.source;
      result.storeAddress = state.address;
    }

    const applyExtensionFlags = (extensionState) => {
      if (extensionState?.talismanNeedsAccountSetup) {
        result.talismanNeedsAccountSetup = true;
      }
    };

    result.direct = await runTaskWithWalletAutomation({
      wallet,
      context,
      extensionOrigin,
      resolveExtensionOrigin: async () => {
        extensionOrigin ||= await getExtensionOrigin(context);
        return extensionOrigin;
      },
      task: () => getDirectProviderState(app, wallet.providerKey, 10_000),
      maxDurationMs: 16_000,
      onExtensionState: applyExtensionFlags,
      onTick: async () => {
        const selected = await clickAppAccountRow(app);
        result.selectedAccountInApp = result.selectedAccountInApp || selected;
      },
    });

    if (hasAuthorizationError(result.direct)) {
      await openWalletModal(app);
      await selectWalletCard(app, wallet.cardName);

      result.direct = await runTaskWithWalletAutomation({
        wallet,
        context,
        extensionOrigin,
        resolveExtensionOrigin: async () => {
          extensionOrigin ||= await getExtensionOrigin(context);
          return extensionOrigin;
        },
        task: () => getDirectProviderState(app, wallet.providerKey, 12_000),
        maxDurationMs: 20_000,
        onExtensionState: applyExtensionFlags,
        onTick: async () => {
          await openWalletModal(app);
          await selectWalletCard(app, wallet.cardName);
          const selected = await clickAppAccountRow(app);
          result.selectedAccountInApp = result.selectedAccountInApp || selected;
        },
      });
    }

    result.signature = await runTaskWithWalletAutomation({
      wallet,
      context,
      extensionOrigin,
      resolveExtensionOrigin: async () => {
        extensionOrigin ||= await getExtensionOrigin(context);
        return extensionOrigin;
      },
      task: () => getSignatureState(app, wallet.providerKey, 20_000),
      maxDurationMs: 30_000,
      onExtensionState: applyExtensionFlags,
      onTick: async () => {
        const selected = await clickAppAccountRow(app);
        result.selectedAccountInApp = result.selectedAccountInApp || selected;
      },
    });

    if (!result.signature?.canSign || hasAuthorizationError(result.signature)) {
      await openWalletModal(app);
      await selectWalletCard(app, wallet.cardName);

      result.signature = await runTaskWithWalletAutomation({
        wallet,
        context,
        extensionOrigin,
        resolveExtensionOrigin: async () => {
          extensionOrigin ||= await getExtensionOrigin(context);
          return extensionOrigin;
        },
        task: () => getSignatureState(app, wallet.providerKey, 28_000),
        maxDurationMs: 40_000,
        onExtensionState: applyExtensionFlags,
        onTick: async () => {
          await openWalletModal(app);
          await selectWalletCard(app, wallet.cardName);
          const selected = await clickAppAccountRow(app);
          result.selectedAccountInApp = result.selectedAccountInApp || selected;
        },
      });
    }

    const hasStore = Boolean(result.storeSource && result.storeAddress);
    const hasDirect = Boolean(result.direct && typeof result.direct === 'object' && 'count' in result.direct && result.direct.count > 0);
    const canSign = Boolean(result.signature?.canSign);
    const nonBlockingSignatureTimeout =
      wallet.key === 'subwallet-js' && routeHash === '#/bridge' && Boolean(result.signature?.timeout);

    result.signatureOptional = nonBlockingSignatureTimeout;
    result.pass = hasStore && hasDirect && (canSign || nonBlockingSignatureTimeout);
  } catch (error) {
    result.error = String(error?.message || error);
  } finally {
    await context?.close().catch(() => {});
  }

  return result;
};

const run = async () => {
  const stopPreviewServer = await ensurePreviewServer(RAW_BASE_URL, BASE_URL);
  const freshProfilesRoot = path.join(base, '.playwright-cli/extensions/profiles-matrix', String(Date.now()));
  try {
    if (FRESH_MODE || USE_RUNTIME_PROFILE_COPIES) {
      await fs.mkdir(freshProfilesRoot, { recursive: true });
    }

    const profilePaths = {};
    for (const wallet of WALLETS) {
      profilePaths[wallet.key] = await ensureProfilePath(wallet, freshProfilesRoot);
    }

    const matrix = [];
    for (const routeHash of ROUTES) {
      for (const wallet of WALLETS) {
        const result = await runRouteWalletCheck(wallet, routeHash, profilePaths[wallet.key]);
        matrix.push(result);
        console.log(JSON.stringify(result));
      }
    }

    const byRoute = ROUTES.map((routeHash) => {
      const rows = matrix.filter((item) => item.route === routeHash);
      return {
        route: routeHash,
        passCount: rows.filter((item) => item.pass).length,
        failCount: rows.filter((item) => !item.pass).length,
        wallets: rows,
      };
    });

    const summary = {
      baseUrl: BASE_URL,
      routes: ROUTES,
      freshMode: FRESH_MODE,
      timestamp: new Date().toISOString(),
      passCount: matrix.filter((item) => item.pass).length,
      failCount: matrix.filter((item) => !item.pass).length,
      byRoute,
    };

    console.log(JSON.stringify({ summary }, null, 2));

    if (summary.failCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    if ((FRESH_MODE || USE_RUNTIME_PROFILE_COPIES) && !KEEP_FRESH_PROFILES) {
      await fs.rm(freshProfilesRoot, { recursive: true, force: true }).catch(() => {});
    }
    await stopPreviewServer();
  }
};

await run();
