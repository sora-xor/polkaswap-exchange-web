import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  ensureAppLoaded,
  expectHash,
  filterKnownWalletConsoleNoise,
  ipfsEntryUrl,
  preparePage,
  trackConsole,
} from './support/ipfs';

const longTimeout = 15_000;
const corruptionPatterns = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];

const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of corruptionPatterns) {
    expect(bodyText).not.toMatch(pattern);
  }
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const metrics = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    return { viewportWidth, docScrollWidth, bodyScrollWidth };
  });

  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
};

const expectLocatorWithinViewport = async (
  page: Page,
  selector: string,
  options: { minTop?: number; maxRightPadding?: number } = {}
): Promise<void> => {
  const { minTop = -1, maxRightPadding = 1 } = options;
  const metrics = await page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.top).toBeGreaterThanOrEqual(minTop);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + maxRightPadding);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
};

const expectLocatorBoxWithinViewport = async (locator: Locator): Promise<void> => {
  const metrics = await locator.first().evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.top).toBeGreaterThanOrEqual(-1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
};

const openSwap = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/swap');
};

const openTrade = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/trade`);
  await ensureAppLoaded(page);
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toMatch(/^#\/trade(?:\/[^/]+\/[^/]+)?$/);
};

const enableNoirTheme = async (page: Page): Promise<void> => {
  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const noirAction = page.locator('.header-menu [data-test-name="noir"]').first();

  await expect(settingsTrigger).toBeVisible();
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(noirAction).toBeVisible();

  await noirAction.click();

  await expect
    .poll(async () => {
      return page.locator('.sora-theme-provider').first().getAttribute('data-theme');
    })
    .toBe('dark');

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);
};

type IconPaint = {
  iconColor: string | null;
  pathFill: string | null;
  pathStroke: string | null;
};

const readSidebarIconPaint = async (page: Page, itemIndex = 0): Promise<IconPaint> => {
  return await page.evaluate((index) => {
    const item = document.querySelectorAll('.app-sidebar .el-menu-item .icon-container i')[index] as HTMLElement | null;
    if (!item) {
      return { iconColor: null, pathFill: null, pathStroke: null };
    }

    const iconStyles = getComputedStyle(item);
    const svg = item.querySelector('svg');
    const isSvgVisible = Boolean(
      svg &&
      (() => {
        const styles = getComputedStyle(svg);
        const rect = svg.getBoundingClientRect();
        return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })()
    );
    const firstPath = isSvgVisible ? (svg?.querySelector('path') ?? null) : null;
    const pathStyles = firstPath ? getComputedStyle(firstPath) : null;

    return {
      iconColor: iconStyles.color ?? null,
      pathFill: pathStyles?.fill ?? null,
      pathStroke: pathStyles?.stroke ?? null,
    };
  }, itemIndex);
};

const expectNotBlack = (value: string | null): void => {
  if (!value || value === 'none') return;
  expect(value).not.toBe('rgb(0, 0, 0)');
};

test.beforeEach(async ({ page }) => {
  await preparePage(page, { stubRuntimeEnv: true });
});

test('supports sidebar navigation across major routes', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const menu = page.locator('.app-menu');
  const navTargets = [
    'Swap',
    'Trade',
    'Rewards',
    'Pool',
    'Staking',
    'Bridge',
    'Account',
    'Burn',
    'Kensetsu',
    'Explore',
    'Statistics',
  ];

  for (const label of navTargets) {
    const link = menu.getByRole('link', { name: label, exact: true }).first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(200);
    await expectNoCorruptedUiText(page);
  }

  expect(consoleErrors).toEqual([]);
});

test('keeps header settings in dropdown', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  await expect(page.locator('.settings-control')).toBeVisible();
  await expect(page.locator('.app-header [data-test-name="language"]')).toHaveCount(0);
  await expect(page.locator('.app-header [data-test-name="currency"]')).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps noir mode active on cede route with dark widget surfaces', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);
  await enableNoirTheme(page);

  await page.goto(`${ipfsEntryUrl}#/deposit/transfer-from-cex`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/deposit/transfer-from-cex');
  await expect
    .poll(async () => {
      return page.locator('.sora-theme-provider').first().getAttribute('data-theme');
    })
    .toBe('dark');

  await expect(page.locator('#cede-widget')).toBeVisible({ timeout: longTimeout });
  await page.waitForTimeout(700);

  const hasDarkWidgetSurface = await page.evaluate(() => {
    const widget = document.querySelector('#cede-widget');
    if (!widget) return false;

    const hasDarkBackground = (value: string): boolean => {
      const channels = value
        .match(/\d+/g)
        ?.slice(0, 3)
        .map((entry) => Number(entry));
      if (!channels || channels.length < 3) return false;

      const [r, g, b] = channels;
      return r < 30 && g < 30 && b < 30;
    };

    const descendants = [widget, ...widget.querySelectorAll<HTMLElement>('*')] as HTMLElement[];
    return descendants.some((element) => hasDarkBackground(getComputedStyle(element).backgroundColor));
  });

  expect(hasDarkWidgetSurface).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('keeps sidebar icon primitives theme-colored instead of hardcoded black', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const lightPaint = await readSidebarIconPaint(page, 0);
  expectNotBlack(lightPaint.iconColor);
  expectNotBlack(lightPaint.pathFill);
  expectNotBlack(lightPaint.pathStroke);

  await enableNoirTheme(page);

  const darkPaint = await readSidebarIconPaint(page, 1);
  expectNotBlack(darkPaint.iconColor);
  expectNotBlack(darkPaint.pathFill);
  expectNotBlack(darkPaint.pathStroke);

  expect(consoleErrors).toEqual([]);
});

test('collapses and expands the sidebar menu', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const sidebar = page.locator('.app-menu');
  const collapseButton = sidebar.locator('.collapse-button');
  const readCollapseButtonMetrics = async () => {
    return await page.evaluate(() => {
      const button = document.querySelector('.app-menu .collapse-button') as HTMLElement | null;
      if (!button) return null;

      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);

      return {
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight: window.innerHeight,
      };
    });
  };

  await expect(sidebar).not.toHaveClass(/collapsed/);
  await expect.poll(readCollapseButtonMetrics).toMatchObject({ opacity: '0', pointerEvents: 'none' });

  await sidebar.hover();
  await expect.poll(readCollapseButtonMetrics).toMatchObject({ opacity: '1', pointerEvents: 'all' });

  await collapseButton.click();
  await expect(sidebar).toHaveClass(/collapsed/);

  await page.mouse.move(900, 120);
  await expect.poll(readCollapseButtonMetrics).toMatchObject({ opacity: '0', pointerEvents: 'none' });

  await sidebar.hover();
  await expect.poll(readCollapseButtonMetrics).toMatchObject({ opacity: '1', pointerEvents: 'all' });
  const collapsedButtonMetrics = await readCollapseButtonMetrics();

  expect(collapsedButtonMetrics).not.toBeNull();
  expect(collapsedButtonMetrics!.top).toBeGreaterThanOrEqual(0);
  expect(collapsedButtonMetrics!.bottom).toBeLessThanOrEqual(collapsedButtonMetrics!.viewportHeight);

  await collapseButton.click();
  await expect(sidebar).not.toHaveClass(/collapsed/);

  expect(consoleErrors).toEqual([]);
});

test('opens and closes mobile sidebar from header menu button', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await expect(menuButton).toBeVisible();
  await expect(menu).not.toHaveClass(/visible/);

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.mouse.click(380, 120);
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('closes mobile sidebar with Escape key', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('navigates from mobile sidebar and closes menu after selection', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.getByRole('link', { name: 'Bridge', exact: true }).first().click();
  await expectHash(page, '#/bridge');
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('closes mobile sidebar on external hash navigation', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, '#/bridge');
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('keeps swap controls clickable after mobile sidebar open-close cycle', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const settingsButton = page.locator('.el-button--settings').first();
  const settingsDialog = page.locator('.market-algorithm');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.mouse.click(380, 120);
  await expect(menu).not.toHaveClass(/visible/);

  await settingsButton.click();
  await expect(settingsDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores swap control clickability immediately after closing mobile sidebar', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const settingsButton = page.locator('.el-button--settings').first();
  const settingsDialog = page.locator('.market-algorithm').first();

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.mouse.click(380, 120);
  await expect(menu).not.toHaveClass(/visible/);

  await settingsButton.click({ trial: true, timeout: 100 });
  await settingsButton.click();
  await expect(settingsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps mobile account button clickable when sidebar is closed', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menu = page.locator('.app-menu');
  const accountButton = page.locator('.account-control').first();

  await expect(menu).not.toHaveClass(/visible/);
  await expect(accountButton).toBeVisible();

  await accountButton.click();
  await expectHash(page, '#/wallet');

  expect(consoleErrors).toEqual([]);
});

test('closes header settings overlay on escape and outside click', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.mouse.click(20, 200);
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps header settings overlay within viewport on desktop', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.header-menu', { minTop: -5, maxRightPadding: 180 });

  expect(consoleErrors).toEqual([]);
});

test('closes header settings overlay on hash navigation change', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, '#/bridge');
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('navigates to wallet from Connect account after closing settings overlay', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const connectAccountButton = page.getByRole('button', { name: /connect account/i }).first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  await connectAccountButton.click();
  await expectHash(page, '#/wallet');

  expect(consoleErrors).toEqual([]);
});

test('renders the wallet connection view without runtime errors when logged out', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/wallet`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/wallet');

  await expect(page.locator('.container--wallet')).toBeVisible();
  await expect(page.getByText(/learn more about wallet connection/i).first()).toBeVisible();

  expect(filterKnownWalletConsoleNoise(consoleErrors)).toEqual([]);
});

test('keeps header account control clickable after closing settings overlay', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const accountControl = page.locator('.header .account-control').first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  await accountControl.click();
  await expectHash(page, '#/wallet');

  expect(consoleErrors).toEqual([]);
});

test('opens swap connect-account dialog while settings overlay is open', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const connectAccountButton = page.locator('.swap-form .action-button', { hasText: /connect account/i });
  const accountDialog = page.getByRole('dialog').filter({ hasText: /Learn more about wallet connection/i });

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await connectAccountButton.click();
  await expect(accountDialog).toBeVisible();
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('opens Kensetsu connect-account dialog without blocking the route content', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.addInitScript(() => {
    localStorage.removeItem('dexSettings.disclaimerApprove');
  });

  await page.goto(`${ipfsEntryUrl}#/kensetsu`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/kensetsu');

  const connectAccountButton = page.locator('.vaults-header__action', { hasText: /connect account/i }).first();
  const accountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /Learn more about wallet connection/i })
    .first();

  await expect(connectAccountButton).toBeVisible();

  await connectAccountButton.click();
  await expect(accountDialog).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('does not auto-show the app disclaimer on wallet before acceptance', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.addInitScript(() => {
    localStorage.removeItem('dexSettings.disclaimerApprove');
  });

  await page.goto(`${ipfsEntryUrl}#/wallet`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/wallet');

  const appDisclaimer = page.locator('.disclaimer-modal .disclaimer').first();
  const walletConnectionHeading = page.getByRole('heading', { name: /account/i }).first();

  await expect(appDisclaimer).toHaveCount(0);
  await expect(walletConnectionHeading).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('keeps swap connect-account dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const connectAccountButton = page.locator('.swap-form .action-button', { hasText: /connect account/i });
  const accountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /Learn more about wallet connection/i })
    .first();
  const accountDialogCard = accountDialog.locator('.dialog-card').first();

  await expect(connectAccountButton).toBeVisible();
  await connectAccountButton.click();
  await expect(accountDialog).toBeVisible();
  await expect(accountDialogCard).toBeVisible();
  await expectLocatorBoxWithinViewport(accountDialogCard);
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press('Escape');
  await expect(accountDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps swap select-token dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const selectTokenTrigger = page.getByRole('button', { name: /choose token/i }).first();
  const selectTokenDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select( a)? token/i })
    .first();
  const selectTokenDialogCard = selectTokenDialog.locator('.dialog-card').first();

  await expect(selectTokenTrigger).toBeVisible();
  await selectTokenTrigger.click();

  await expect(selectTokenDialog).toBeVisible();
  await expect(selectTokenDialogCard).toBeVisible();
  await expectLocatorBoxWithinViewport(selectTokenDialogCard);
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press('Escape');
  await expect(selectTokenDialog).toHaveCount(0);

  await selectTokenTrigger.click();
  await expect(selectTokenDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(selectTokenDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps swap controls clickable after closing select-token dialog on extra narrow mobile screens', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const selectTokenTrigger = page.getByRole('button', { name: /choose token/i }).first();
  const selectTokenDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select( a)? token/i })
    .first();
  const connectAccountButton = page.locator('.swap-form .action-button', { hasText: /connect account/i });
  const connectAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /Learn more about wallet connection/i })
    .first();

  await expect(selectTokenTrigger).toBeVisible();
  await selectTokenTrigger.click();
  await expect(selectTokenDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(selectTokenDialog).toHaveCount(0);

  await expect(connectAccountButton).toBeVisible();
  await connectAccountButton.click();
  await expect(connectAccountDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(connectAccountDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores swap control clickability immediately after closing select-token dialog', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const selectTokenTrigger = page.getByRole('button', { name: /choose token/i }).first();
  const selectTokenDialog = page
    .getByRole('dialog')
    .filter({ hasText: /select( a)? token/i })
    .first();
  const connectAccountButton = page.locator('.swap-form .action-button', { hasText: /connect account/i });
  const connectAccountDialog = page
    .getByRole('dialog')
    .filter({ hasText: /Learn more about wallet connection/i })
    .first();

  await expect(selectTokenTrigger).toBeVisible();
  await selectTokenTrigger.click();
  await expect(selectTokenDialog).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(connectAccountButton).toBeVisible();
  await connectAccountButton.click({ trial: true, timeout: 100 });
  await connectAccountButton.click();
  await expect(connectAccountDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(connectAccountDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('navigates via header logo and Buy Tokens button', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.goto(`${ipfsEntryUrl}#/bridge`);
  await ensureAppLoaded(page);
  await expectHash(page, '#/bridge');

  await page.locator('.app-logo--header').click();
  await expectHash(page, '#/swap');

  await page.getByRole('button', { name: /buy tokens/i }).click();
  await expectHash(page, '#/deposit');

  expect(consoleErrors).toEqual([]);
});

test('opens and closes swap settings dialog from market settings button', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsButton = page.locator('.el-button--settings').first();
  const settingsDialog = page.locator('.market-algorithm');

  await settingsButton.click();
  await expect(settingsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps swap settings dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsButton = page.locator('.el-button--settings').first();
  const settingsDialogBody = page.locator('.market-algorithm').first();
  const settingsDialog = page.getByRole('dialog').filter({ has: settingsDialogBody }).first();
  const settingsDialogCard = settingsDialog.locator('.dialog-card').first();

  await expect(settingsButton).toBeVisible();
  await settingsButton.click();
  await expect(settingsDialogBody).toBeVisible();
  await expect(settingsDialog).toBeVisible();
  await expect(settingsDialogCard).toBeVisible();
  await expectLocatorBoxWithinViewport(settingsDialogCard);
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);

  await settingsButton.click();
  await expect(settingsDialogBody).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores swap settings trigger clickability immediately after closing market settings dialog', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsButton = page.locator('.el-button--settings').first();
  const settingsDialogBody = page.locator('.market-algorithm').first();
  const settingsDialog = page.getByRole('dialog').filter({ has: settingsDialogBody }).first();

  await settingsButton.click();
  await expect(settingsDialog).toBeVisible();

  await page.keyboard.press('Escape');

  await settingsButton.click({ trial: true, timeout: 100 });
  await settingsButton.click();
  await expect(settingsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(settingsDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('closes header settings overlay when opening notification settings', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await page.locator('.header-menu [data-test-name="notification"]').click();
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores header settings trigger clickability immediately after closing notification settings dialog', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const alertsDialog = page
    .getByRole('dialog')
    .filter({ hasText: /alerts/i })
    .first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.locator('.header-menu [data-test-name="notification"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(alertsDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(alertsDialog).toHaveCount(0);

  await settingsTrigger.click({ trial: true, timeout: 100 });
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('toggles slippage tolerance section in swap form', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const slippageToggle = page.getByRole('button', { name: /slippage tolerance/i }).first();
  const slippageWrap = page.locator('.slippage-tolerance .el-collapse-item__wrap').first();

  await expect(slippageWrap).toBeHidden();

  await slippageToggle.click();
  await expect(slippageWrap).toBeVisible();

  await slippageToggle.click();
  await expect(slippageWrap).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test('opens language and currency dialogs from header settings without overlay stacking', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const languageDialog = page.getByRole('dialog').filter({ hasText: /language/i });
  const currencyDialog = page.getByRole('dialog').filter({ hasText: /currency/i });

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await page.locator('.header-menu [data-test-name="language"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(languageDialog).toBeVisible();
  await expect(page.locator('.select-language-item__name').first()).toContainText('English');
  await expect(page.locator('.select-language-item__name').first()).not.toContainText('languages.');
  await page.keyboard.press('Escape');
  await expect(languageDialog).toHaveCount(0);

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await page.locator('.header-menu [data-test-name="currency"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(currencyDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(currencyDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('opens the language dialog from header settings in Akkadian mode via keyboard without opening alerts', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);

  await page.addInitScript(() => {
    localStorage.setItem('dexSettings.language', 'akk');
  });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const languageAction = page.locator('.header-menu [data-test-name="language"]').first();
  const languageDialog = page.locator('.dialog-card.select-language-dialog').first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(languageAction).toHaveAttribute('tabindex', '0');

  await languageAction.focus();
  await expect(languageAction).toBeFocused();
  await languageAction.press('Enter');

  await expect(settingsOverlay).toHaveCount(0);
  await expect(languageDialog).toBeVisible();
  await expect(page.locator('.alerts-list-scrollbar, .alerts-list')).toHaveCount(0);
  await expect(page.locator('.browser-notification')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(languageDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('covers the desktop sidebar when a dialog overlay is open', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const languageDialog = page
    .getByRole('dialog')
    .filter({ hasText: /language/i })
    .first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await page.locator('.header-menu [data-test-name="language"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(languageDialog).toBeVisible();

  const overlayCoverage = await page.evaluate(() => {
    const overlay = document.querySelector('.dialog-wrapper__overlay, .s-modal__overlay') as HTMLElement | null;
    const sidebar = document.querySelector('.app-sidebar') as HTMLElement | null;
    if (!overlay || !sidebar) return null;

    const rect = sidebar.getBoundingClientRect();
    const sampleX = Math.min(Math.max(rect.left + rect.width / 2, 8), window.innerWidth - 8);
    const sampleY = Math.min(Math.max(rect.top + 160, 8), window.innerHeight - 8);
    const topElement = document.elementFromPoint(sampleX, sampleY) as HTMLElement | null;

    return {
      intercepted: Boolean(topElement?.closest('.dialog-wrapper__overlay, .s-modal__overlay')),
      overlayRect: overlay.getBoundingClientRect().toJSON(),
    };
  });

  expect(overlayCoverage).not.toBeNull();
  expect(overlayCoverage?.intercepted).toBe(true);
  expect(overlayCoverage?.overlayRect.left ?? 1).toBeLessThanOrEqual(0);
  expect(overlayCoverage?.overlayRect.top ?? 1).toBeLessThanOrEqual(0);
  expect(overlayCoverage?.overlayRect.right ?? 0).toBeGreaterThanOrEqual(1439);
  expect(overlayCoverage?.overlayRect.bottom ?? 0).toBeGreaterThanOrEqual(899);

  await page.keyboard.press('Escape');
  await expect(languageDialog).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps language dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const languageDialog = page
    .getByRole('dialog')
    .filter({ hasText: /language/i })
    .first();
  const languageDialogCard = languageDialog.locator('.dialog-card').first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.locator('.header-menu [data-test-name="language"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(languageDialog).toBeVisible();
  await expect(languageDialogCard).toBeVisible();
  await expectLocatorBoxWithinViewport(languageDialogCard);
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press('Escape');
  await expect(languageDialog).toHaveCount(0);

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('restores header settings trigger clickability immediately after closing language dialog', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const languageDialog = page
    .getByRole('dialog')
    .filter({ hasText: /language/i })
    .first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.locator('.header-menu [data-test-name="language"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(languageDialog).toBeVisible();

  await page.keyboard.press('Escape');

  await settingsTrigger.click({ trial: true, timeout: 100 });
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps currency dialog within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const currencyDialog = page
    .getByRole('dialog')
    .filter({ hasText: /currency/i })
    .first();
  const currencyDialogCard = currencyDialog.locator('.dialog-card').first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.locator('.header-menu [data-test-name="currency"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(currencyDialog).toBeVisible();
  await expect(currencyDialogCard).toBeVisible();
  await expectLocatorBoxWithinViewport(currencyDialogCard);
  await expectNoHorizontalOverflow(page);

  const searchInput = currencyDialog.locator('input').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill('usd');
  await expect(searchInput).toHaveValue('usd');

  await page.keyboard.press('Escape');
  await expect(currencyDialog).toHaveCount(0);

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('restores header settings trigger clickability immediately after closing currency dialog', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 653 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const currencyDialog = page
    .getByRole('dialog')
    .filter({ hasText: /currency/i })
    .first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.locator('.header-menu [data-test-name="currency"]').click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(currencyDialog).toBeVisible();

  await page.keyboard.press('Escape');

  await settingsTrigger.click({ trial: true, timeout: 100 });
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('opens stats filter dropdown and closes it on outside click', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  await page.getByRole('link', { name: 'Statistics', exact: true }).first().click();
  await expectHash(page, '#/stats');

  const statsFilter = page.locator('.stats-filter').first();
  const statsFilterButton = statsFilter.locator('.stats-filter-button');
  const statsFilterMenu = statsFilter.locator('.stats-filter-menu');

  await expect(statsFilter).toBeVisible();

  if (await statsFilterButton.isDisabled()) {
    await expect(statsFilterButton).toBeDisabled();
    expect(consoleErrors).toEqual([]);
    return;
  }

  await statsFilterButton.click();
  await expect(statsFilterMenu).toBeVisible();

  await page.mouse.click(20, 20);
  await expect(statsFilterMenu).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test('closes stats filter dropdown on viewport breakpoint switch', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  await page.getByRole('link', { name: 'Statistics', exact: true }).first().click();
  await expectHash(page, '#/stats');

  const statsFilter = page.locator('.stats-filter').first();
  const statsFilterButton = statsFilter.locator('.stats-filter-button');
  const statsFilterMenu = statsFilter.locator('.stats-filter-menu');

  await expect(statsFilter).toBeVisible();

  if (await statsFilterButton.isDisabled()) {
    await expect(statsFilterButton).toBeDisabled();
    expect(consoleErrors).toEqual([]);
    return;
  }

  await statsFilterButton.click();
  await expect(statsFilterMenu).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(statsFilterMenu).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test('keeps stats filter dropdown within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.getByRole('link', { name: 'Statistics', exact: true }).first().click();
  await expectHash(page, '#/stats');
  await expect(menu).not.toHaveClass(/visible/);

  const statsFilter = page.locator('.stats-filter').first();
  const statsFilterButton = statsFilter.locator('.stats-filter-button');
  const statsFilterMenu = statsFilter.locator('.stats-filter-menu');

  await expect(statsFilter).toBeVisible();

  if (await statsFilterButton.isDisabled()) {
    await expect(statsFilterButton).toBeDisabled();
    expect(consoleErrors).toEqual([]);
    return;
  }

  await statsFilterButton.click();
  await expect(statsFilterMenu).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.stats-filter-menu');

  expect(consoleErrors).toEqual([]);
});

test('keeps stats filter colors aligned with production in noir mode', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);
  await enableNoirTheme(page);

  await page.getByRole('link', { name: 'Statistics', exact: true }).first().click();
  await expectHash(page, '#/stats');

  const statsFilter = page.locator('.stats-filter').first();
  const statsFilterButton = statsFilter.locator('.stats-filter-button');
  const statsFilterMenu = statsFilter.locator('.stats-filter-menu');

  await expect(statsFilter).toBeVisible();

  if (await statsFilterButton.isDisabled()) {
    await expect(statsFilterButton).toBeDisabled();
    expect(consoleErrors).toEqual([]);
    return;
  }

  await statsFilterButton.click();
  await expect(statsFilterMenu).toBeVisible();

  const colors = await statsFilter.evaluate((root) => {
    const trigger = root.querySelector('.stats-filter-button') as HTMLElement | null;
    const selected = root.querySelector('.stats-filter-list-item.s-pressed') as HTMLElement | null;
    const unselected = root.querySelector('.stats-filter-list-item:not(.s-pressed)') as HTMLElement | null;

    return {
      trigger: trigger ? getComputedStyle(trigger).color : null,
      selected: selected ? getComputedStyle(selected).color : null,
      unselected: unselected ? getComputedStyle(unselected).color : null,
    };
  });

  expect(colors.trigger).toBe('rgb(240, 215, 220)');
  expect(colors.selected).toBe('rgb(242, 65, 151)');
  expect(colors.unselected).toBe('rgb(240, 215, 220)');
  expect(consoleErrors).toEqual([]);
});

test('opens info popover and launches the SORA Wallet popup dialog', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');
  const mobilePopupDialog = page.getByRole('dialog').filter({ hasText: /Download\s+SORA Wallet/i });

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();
  await expect(infoPopover).toContainText('Swap tokens from different networks');

  await infoPopover.getByRole('button', { name: /Get SORA Wallet/i }).click();
  await expect(mobilePopupDialog).toBeVisible();
  await expect(infoPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps header and sidebar interactions stable across desktop and mobile viewport switches', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);
  await page.mouse.click(380, 120);
  await expect(menu).not.toHaveClass(/visible/);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(settingsTrigger).toBeVisible();
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('maintains layout within viewport width on desktop and mobile interaction states', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  await expectNoHorizontalOverflow(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  await settingsTrigger.click();
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);
  await expectNoHorizontalOverflow(page);
  await page.mouse.click(380, 120);

  expect(consoleErrors).toEqual([]);
});

test('keeps mobile sidebar within viewport width on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);
  await expectNoHorizontalOverflow(page);

  await page.mouse.click(310, 120);
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('keeps mobile sidebar within viewport width on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);
  await expectNoHorizontalOverflow(page);

  await page.mouse.click(270, 120);
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('keeps inline transaction details within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const detailsTrigger = page.locator('.transaction-details').first();
  const inlineDetails = page.locator('.transaction-details-inline-content');

  if ((await detailsTrigger.count()) === 0) {
    expect(consoleErrors).toEqual([]);
    return;
  }

  await detailsTrigger.click();
  await expect(inlineDetails).toHaveCount(1);
  await expect(page.locator('.transaction-details-popper')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  expect(consoleErrors).toEqual([]);
});

test('keeps inline transaction details within viewport on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const detailsTrigger = page.locator('.transaction-details').first();
  const inlineDetails = page.locator('.transaction-details-inline-content');

  if ((await detailsTrigger.count()) === 0) {
    expect(consoleErrors).toEqual([]);
    return;
  }

  await detailsTrigger.click();
  await expect(inlineDetails).toHaveCount(1);
  await expect(page.locator('.transaction-details-popper')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.transaction-details-inline-content');

  expect(consoleErrors).toEqual([]);
});

test('resets mobile sidebar visibility across breakpoint switches', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('closes header settings overlay on viewport breakpoint switch', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(settingsOverlay).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps header settings overlay within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.header-menu', { minTop: -5, maxRightPadding: 180 });

  expect(consoleErrors).toEqual([]);
});

test('keeps header settings overlay within viewport on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.header-menu', { minTop: -5, maxRightPadding: 180 });

  expect(consoleErrors).toEqual([]);
});

test('closes info popover when mobile sidebar closes on backdrop click', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  await page.mouse.click(380, 120);
  await expect(menu).not.toHaveClass(/visible/);
  await expect(infoPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('closes info popover and mobile sidebar on Escape', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/visible/);
  await expect(infoPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores info popover trigger clickability immediately after escape close', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(infoPopover).toHaveCount(0);

  await infoTrigger.click({ trial: true, timeout: 100 });
  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('closes info popover on hash navigation change', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, '#/bridge');
  await expect(infoPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('closes info popover on viewport breakpoint switch', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(infoPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('closes footer status popover on escape and outside click', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const footerStatusItem = page.locator('.app-status .app-status__item').first();
  const footerPopover = page.locator('.app-status__tooltip');

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(footerPopover).toHaveCount(0);

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);

  await page.mouse.click(20, 200);
  await expect(footerPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores footer status trigger clickability immediately after closing popover', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const footerStatusItem = page.locator('.app-status .app-status__item').first();
  const footerPopover = page.locator('.app-status__tooltip');

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(footerPopover).toHaveCount(0);

  await footerStatusItem.click({ trial: true, timeout: 100 });
  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(footerPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('closes footer status popover on hash navigation change', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const footerStatusItem = page.locator('.app-status .app-status__item').first();
  const footerPopover = page.locator('.app-status__tooltip');

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);

  await page.evaluate(() => {
    window.location.hash = '#/bridge';
  });
  await expectHash(page, '#/bridge');
  await expect(footerPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('closes footer status popover on viewport breakpoint switch', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const footerStatusItem = page.locator('.app-status .app-status__item').first();
  const footerPopover = page.locator('.app-status__tooltip');

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(footerPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('keeps footer status popover within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const footerStatusItem = page.locator('.app-status .app-status__item').first();
  const footerPopover = page.locator('.app-status__tooltip');

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.app-status__tooltip');

  expect(consoleErrors).toEqual([]);
});

test('keeps footer status popover within viewport on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const footerStatusItem = page.locator('.app-status .app-status__item').first();
  const footerPopover = page.locator('.app-status__tooltip');

  await footerStatusItem.click();
  await expect(footerPopover).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.app-status__tooltip');

  expect(consoleErrors).toEqual([]);
});

test('keeps info popover within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);
  await infoTrigger.click();
  await expect(infoPopover).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.app-info-popper');

  expect(consoleErrors).toEqual([]);
});

test('keeps info popover within viewport on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);
  await infoTrigger.click();
  await expect(infoPopover).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.app-info-popper');

  expect(consoleErrors).toEqual([]);
});

test('closes mobile sidebar when launching SORA Wallet popup from info popover', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');
  const mobilePopupDialog = page.getByRole('dialog').filter({ hasText: /Download\s+SORA Wallet/i });

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await infoTrigger.click();
  await expect(infoPopover).toBeVisible();

  await infoPopover.getByRole('button', { name: /Get SORA Wallet/i }).click();
  await expect(mobilePopupDialog).toBeVisible();
  await expect(menu).not.toHaveClass(/visible/);

  expect(consoleErrors).toEqual([]);
});

test('keeps SORA Wallet popup within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');
  const mobilePopupDialog = page.getByRole('dialog').filter({ hasText: /Download\s+SORA Wallet/i });

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await infoTrigger.click();
  await expect(infoPopover).toHaveCount(1);

  await infoPopover.getByRole('button', { name: /Get SORA Wallet/i }).click();
  await expect(mobilePopupDialog).toBeVisible();
  await expect(menu).not.toHaveClass(/visible/);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.popup-mobile');

  expect(consoleErrors).toEqual([]);
});

test('keeps SORA Wallet popup within viewport on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const menuButton = page.locator('.app-menu-button');
  const menu = page.locator('.app-menu');
  const infoTrigger = page.locator('.app-menu .menu-item--small').first();
  const infoPopover = page.locator('.app-info-popper');
  const mobilePopupDialog = page.getByRole('dialog').filter({ hasText: /Download\s+SORA Wallet/i });

  await menuButton.click();
  await expect(menu).toHaveClass(/visible/);

  await infoTrigger.click();
  await expect(infoPopover).toHaveCount(1);

  await infoPopover.getByRole('button', { name: /Get SORA Wallet/i }).click();
  await expect(mobilePopupDialog).toBeVisible();
  await expect(menu).not.toHaveClass(/visible/);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.popup-mobile');

  expect(consoleErrors).toEqual([]);
});

test('closes order-book pair-list popover on escape and outside click', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openTrade(page);

  const pairTrigger = page.locator('.order-book-choose-pair').first();
  const pairPopover = page.locator('.order-book-whitelist');

  await expect(pairTrigger).toBeVisible();
  await pairTrigger.click();
  await expect(pairPopover).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(pairPopover).toHaveCount(0);

  await pairTrigger.click();
  await expect(pairPopover).toHaveCount(1);

  await page.mouse.click(20, 200);
  await expect(pairPopover).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});

test('restores order-book pair-list trigger clickability immediately after closing popover', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openTrade(page);

  const pairTrigger = page.locator('.order-book-choose-pair').first();
  const pairPopover = page.locator('.order-book-whitelist');

  await expect(pairTrigger).toBeVisible();
  await pairTrigger.click();
  await expect(pairPopover).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(pairPopover).toHaveCount(0);

  await pairTrigger.click({ trial: true, timeout: 100 });
  await pairTrigger.click();
  await expect(pairPopover).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('keeps order-book pair-list popover within viewport on narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openTrade(page);

  const pairTrigger = page.locator('.order-book-choose-pair').first();
  const pairPopover = page.locator('.order-book-whitelist');

  await expect(pairTrigger).toBeVisible();
  await pairTrigger.click();
  await expect(pairPopover).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.order-book-whitelist');

  expect(consoleErrors).toEqual([]);
});

test('keeps order-book pair-list popover within viewport on extra narrow screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openTrade(page);

  const pairTrigger = page.locator('.order-book-choose-pair').first();
  const pairPopover = page.locator('.order-book-whitelist');

  await expect(pairTrigger).toBeVisible();
  await pairTrigger.click();
  await expect(pairPopover).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.order-book-whitelist');

  expect(consoleErrors).toEqual([]);
});

test('keeps disclaimer overlay within viewport on desktop', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const disclaimerAction = page.locator('.header-menu [data-test-name="disclaimer"]');
  const disclaimer = page.locator('.disclaimer');
  const swapForm = page.locator('.swap-form').first();

  const swapFormTopBefore = await swapForm.evaluate((element) => element.getBoundingClientRect().top);

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(disclaimerAction).toBeVisible();

  await disclaimerAction.click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(disclaimer).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.disclaimer');

  const swapFormTopAfter = await swapForm.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(swapFormTopAfter - swapFormTopBefore)).toBeLessThanOrEqual(1);

  expect(consoleErrors).toEqual([]);
});

test('covers the full viewport with the first-launch disclaimer overlay on desktop', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.addInitScript(() => {
    localStorage.removeItem('dexSettings.disclaimerApprove');
  });
  await openSwap(page);

  const disclaimer = page.locator('.disclaimer');
  const overlay = page.locator('.s-modal__overlay').first();

  await expect(disclaimer).toBeVisible();
  await expect(overlay).toBeVisible();

  const overlayCoverage = await page.evaluate(() => {
    const overlay = document.querySelector('.s-modal__overlay') as HTMLElement | null;
    if (!overlay) return null;

    const rect = overlay.getBoundingClientRect();
    const samplePoints = [
      [8, 8],
      [window.innerWidth - 8, 8],
      [8, window.innerHeight - 8],
    ] as const;

    return {
      rect: rect.toJSON(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      intercepted: samplePoints.every(([x, y]) =>
        Boolean(document.elementFromPoint(x, y)?.closest('.s-modal__overlay'))
      ),
    };
  });

  expect(overlayCoverage).not.toBeNull();
  expect(overlayCoverage?.intercepted).toBe(true);
  expect(overlayCoverage?.rect.left ?? 1).toBeLessThanOrEqual(0);
  expect(overlayCoverage?.rect.top ?? 1).toBeLessThanOrEqual(0);
  expect(overlayCoverage?.rect.right ?? 0).toBeGreaterThanOrEqual((overlayCoverage?.viewportWidth ?? 0) - 1);
  expect(overlayCoverage?.rect.bottom ?? 0).toBeGreaterThanOrEqual((overlayCoverage?.viewportHeight ?? 0) - 1);

  expect(consoleErrors).toEqual([]);
});

test('restores header settings trigger clickability immediately after closing disclaimer overlay', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await page.addInitScript(() => {
    localStorage.setItem('dexSettings.disclaimerApprove', 'true');
  });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const disclaimerAction = page.locator('.header-menu [data-test-name="disclaimer"]');
  const disclaimer = page.locator('.disclaimer');
  const disclaimerCloseButton = page.locator('.disclaimer__header-close-btn').first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(disclaimerAction).toBeVisible();

  await disclaimerAction.click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(disclaimer).toBeVisible();
  await expect(disclaimerCloseButton).toBeVisible();

  await disclaimerCloseButton.click();
  await expect(disclaimer).toHaveCount(0);

  await settingsTrigger.click({ trial: true, timeout: 100 });
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('restores header settings trigger clickability immediately after closing disclaimer overlay on narrow mobile', async ({
  page,
}) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });

  await page.addInitScript(() => {
    localStorage.setItem('dexSettings.disclaimerApprove', 'true');
  });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const disclaimerAction = page.locator('.header-menu [data-test-name="disclaimer"]');
  const disclaimer = page.locator('.disclaimer');
  const disclaimerCloseButton = page.locator('.disclaimer__header-close-btn').first();

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(disclaimerAction).toBeVisible();

  await disclaimerAction.click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(disclaimer).toBeVisible();
  await expect(disclaimerCloseButton).toBeVisible();

  await disclaimerCloseButton.click();
  await expect(disclaimer).toHaveCount(0);

  await settingsTrigger.click({ trial: true, timeout: 100 });
  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);

  expect(consoleErrors).toEqual([]);
});

test('keeps disclaimer overlay within viewport on narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const disclaimerAction = page.locator('.header-menu [data-test-name="disclaimer"]');
  const disclaimer = page.locator('.disclaimer');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(disclaimerAction).toBeVisible();

  await disclaimerAction.click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(disclaimer).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.disclaimer');

  expect(consoleErrors).toEqual([]);
});

test('keeps disclaimer overlay within viewport on extra narrow mobile screens', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await page.setViewportSize({ width: 280, height: 640 });
  await openSwap(page);

  const settingsTrigger = page.locator('.app-header-menu .header-menu__button').first();
  const settingsOverlay = page.locator('.header-menu');
  const disclaimerAction = page.locator('.header-menu [data-test-name="disclaimer"]');
  const disclaimer = page.locator('.disclaimer');

  await settingsTrigger.click();
  await expect(settingsOverlay).toHaveCount(1);
  await expect(disclaimerAction).toBeVisible();

  await disclaimerAction.click();
  await expect(settingsOverlay).toHaveCount(0);
  await expect(disclaimer).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectLocatorWithinViewport(page, '.disclaimer');

  expect(consoleErrors).toEqual([]);
});

test('keeps swap shell layout stable across representative viewport widths', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  const viewports = [
    { width: 320, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 900 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openSwap(page);
    await expectNoHorizontalOverflow(page);
    await expectLocatorWithinViewport(page, '.header');
    await expectLocatorWithinViewport(page, '.account-control');
  }

  expect(consoleErrors).toEqual([]);
});
