import { expect, test, type Page } from '@playwright/test';

import { ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

const corruptionPatterns = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];
const bodySamplesPerRoute = 6;
const bodySampleDelayMs = 250;
const routeChurnAllowedConsolePatterns = [
  /RPC-CORE: .*disconnected from wss:\/\/ws\.mof\.sora\.org/i,
  /API\/INIT: Error: FATAL: Unable to initialize the API: disconnected from wss:\/\/ws\.mof\.sora\.org/i,
];

type RouteTarget = {
  target: string;
  acceptedHashes: string[];
};

const routeTargets: RouteTarget[] = [
  { target: '/swap', acceptedHashes: ['#/swap'] },
  { target: '/trade', acceptedHashes: ['#/trade'] },
  { target: '/polkamarkt', acceptedHashes: ['#/polkamarkt'] },
  { target: '/rewards', acceptedHashes: ['#/rewards', '#/points'] },
  { target: '/pool', acceptedHashes: ['#/pool'] },
  { target: '/staking', acceptedHashes: ['#/staking'] },
  { target: '/bridge', acceptedHashes: ['#/bridge'] },
  { target: '/wallet', acceptedHashes: ['#/wallet'] },
  { target: '/kensetsu', acceptedHashes: ['#/kensetsu'] },
  { target: '/explore', acceptedHashes: ['#/explore'] },
  { target: '/stats', acceptedHashes: ['#/stats'] },
  // Protected route: unauthenticated users are redirected back to swap.
  { target: '/account', acceptedHashes: ['#/account', '#/swap'] },
];

const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of corruptionPatterns) {
    expect(bodyText).not.toMatch(pattern);
  }
};

const sampleNoCorruptedUiText = async (page: Page): Promise<void> => {
  for (let sample = 0; sample < bodySamplesPerRoute; sample += 1) {
    await page.waitForTimeout(bodySampleDelayMs);
    await expectNoCorruptedUiText(page);
  }
};

const ensureShellLoaded = async (page: Page): Promise<void> => {
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('#app').length)).resolves.toBe(1);
  await expect(page.locator('header.header').first()).toBeVisible({ timeout: 15_000 });
};

const waitForAcceptedHash = async (page: Page, acceptedHashes: string[]): Promise<void> => {
  const accepted = acceptedHashes;
  await page.waitForFunction(
    (expectedHashes) => {
      const current = window.location.hash;
      return expectedHashes.some((expected) => current === expected || current.startsWith(`${expected}/`));
    },
    accepted,
    { timeout: 15_000 }
  );
};

const navigateInApp = async (page: Page, route: RouteTarget): Promise<void> => {
  await page.evaluate((target) => {
    window.location.hash = target;
  }, route.target);
  await waitForAcceptedHash(page, route.acceptedHashes);
  await sampleNoCorruptedUiText(page);
};

const runRouteCycles = async (page: Page, routes: RouteTarget[], rounds: number): Promise<void> => {
  for (let round = 0; round < rounds; round += 1) {
    for (const route of routes) {
      await navigateInApp(page, route);
    }
  }
};

test.beforeEach(async ({ page }) => {
  await preparePage(page, { stubRuntimeEnv: true });
});

test('keeps full route churn stable on desktop', async ({ page }) => {
  test.slow();
  const consoleErrors = trackConsole(page, { extraAllowedPatterns: routeChurnAllowedConsolePatterns });

  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureShellLoaded(page);
  await runRouteCycles(page, routeTargets, 3);

  expect(consoleErrors).toEqual([]);
});

test('keeps full route churn stable on mobile viewport', async ({ page }) => {
  test.slow();
  const consoleErrors = trackConsole(page, { extraAllowedPatterns: routeChurnAllowedConsolePatterns });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureShellLoaded(page);
  await runRouteCycles(page, routeTargets, 2);

  expect(consoleErrors).toEqual([]);
});

test('tears down route-specific overlays during hash churn and preserves control clickability', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureShellLoaded(page);
  await sampleNoCorruptedUiText(page);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await waitForAcceptedHash(page, ['#/bridge']);
  await sampleNoCorruptedUiText(page);
  await expect(swapSettingsDialog).toHaveCount(0);

  const bridgeNetworkTrigger = page.locator('.bridge .el-button--settings').first();
  const bridgeNetworkDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select network/i })
    .first();

  await expect(bridgeNetworkTrigger).toBeVisible();
  await bridgeNetworkTrigger.click();
  await expect(bridgeNetworkDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await waitForAcceptedHash(page, ['#/swap']);
  await sampleNoCorruptedUiText(page);
  await expect(bridgeNetworkDialog).toHaveCount(0);

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('does not leak swap token dialog overlay after hash navigation to wallet', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureShellLoaded(page);
  await sampleNoCorruptedUiText(page);

  const swapTokenTrigger = page.locator('.token-select-button').first();
  const swapTokenDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select( a)? token/i })
    .first();

  await expect(swapTokenTrigger).toBeVisible();
  await swapTokenTrigger.click();
  await expect(swapTokenDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/wallet';
  });
  await waitForAcceptedHash(page, ['#/wallet']);
  await sampleNoCorruptedUiText(page);
  await expect(swapTokenDialog).toHaveCount(0);
  await expect(page.locator('.container--wallet')).toBeVisible();

  const settingsTrigger = page.locator('.app-header-menu i.s-icon-grid-block-align-left-24').first();
  const settingsOverlay = page.locator('.header-menu');

  await expect(settingsTrigger).toBeVisible();
  await settingsTrigger.click({ trial: true, timeout: 2_000 });
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('does not leak wallet header settings overlay after hash navigation back to swap', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/wallet`);
  await ensureShellLoaded(page);
  await waitForAcceptedHash(page, ['#/wallet']);
  await sampleNoCorruptedUiText(page);

  const settingsTrigger = page.locator('.app-header-menu i.s-icon-grid-block-align-left-24').first();
  const settingsOverlay = page.locator('.header-menu');

  await expect(settingsTrigger).toBeVisible();
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await waitForAcceptedHash(page, ['#/swap']);
  await sampleNoCorruptedUiText(page);
  await expect(settingsOverlay).toHaveCount(0);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('does not leak deposit connect dialog overlay after hash navigation to swap', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/deposit`);
  await ensureShellLoaded(page);
  await waitForAcceptedHash(page, ['#/deposit']);
  await sampleNoCorruptedUiText(page);

  const depositActionButton = page.locator('.pay-options-moonpay button').first();
  const connectDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(depositActionButton).toBeVisible();
  await depositActionButton.click();
  await expect(connectDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await waitForAcceptedHash(page, ['#/swap']);
  await sampleNoCorruptedUiText(page);
  await expect(connectDialog).toHaveCount(0);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('does not leak rewards connect dialog overlay after hash navigation to swap', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/points`);
  await ensureShellLoaded(page);
  await waitForAcceptedHash(page, ['#/points', '#/rewards']);
  await sampleNoCorruptedUiText(page);

  const rewardsActionButton = page
    .locator('.app-content button:enabled')
    .filter({ hasText: /connect account/i })
    .first();
  const connectDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(rewardsActionButton).toBeVisible();
  await rewardsActionButton.click();
  await expect(connectDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await waitForAcceptedHash(page, ['#/swap']);
  await sampleNoCorruptedUiText(page);
  await expect(connectDialog).toHaveCount(0);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('does not leak pool connect dialog overlay after hash navigation to swap', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/pool`);
  await ensureShellLoaded(page);
  await waitForAcceptedHash(page, ['#/pool']);
  await sampleNoCorruptedUiText(page);

  const poolConnectButton = page
    .locator('.app-content button:enabled')
    .filter({ hasText: /connect account|connect wallet/i })
    .first();
  const connectDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(poolConnectButton).toBeVisible();
  await poolConnectButton.click();
  await expect(connectDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await waitForAcceptedHash(page, ['#/swap']);
  await sampleNoCorruptedUiText(page);
  await expect(connectDialog).toHaveCount(0);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('does not leak staking connect dialog overlay after hash navigation to swap', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/staking/sora`);
  await ensureShellLoaded(page);
  await waitForAcceptedHash(page, ['#/staking/sora']);
  await sampleNoCorruptedUiText(page);

  const stakingConnectButton = page
    .locator('.app-content button:enabled')
    .filter({ hasText: /connect account|connect wallet/i })
    .first();
  const connectDialog = page
    .getByRole('dialog')
    .filter({ hasText: /learn more about wallet connection/i })
    .first();

  await expect(stakingConnectButton).toBeVisible();
  await stakingConnectButton.click();
  await expect(connectDialog).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/swap';
  });
  await waitForAcceptedHash(page, ['#/swap']);
  await sampleNoCorruptedUiText(page);
  await expect(connectDialog).toHaveCount(0);

  const swapSettingsTrigger = page.locator('.el-button--settings').first();
  const swapSettingsDialog = page.locator('.market-algorithm').first();

  await expect(swapSettingsTrigger).toBeVisible();
  await swapSettingsTrigger.click({ trial: true, timeout: 2_000 });
  await swapSettingsTrigger.click();
  await expect(swapSettingsDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
