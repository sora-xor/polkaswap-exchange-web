import { expect, test, type Page } from '@playwright/test';

import { ensureAppLoaded, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

// Playwright executes specs outside Vite aliases, so keep the XOR asset id local to the test.
const XOR_ADDRESS = '0x0200000000000000000000000000000000000000000000000000000000000000';
const neutralSurfacePalette: Array<[number, number, number]> = [
  [93, 47, 115],
  [73, 32, 103],
  [247, 243, 244],
  [242, 237, 240],
  [235, 231, 232],
];

const openSwap = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/swap`);
  await ensureAppLoaded(page);
};

const openBurn = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/burn`);
  await ensureAppLoaded(page);
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe('#/burn');
  await expect(page.locator('.burn-container')).toBeVisible({ timeout: 15_000 });
};

const openTrade = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/trade`);
  await ensureAppLoaded(page);
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toMatch(/^#\/trade(?:\/[^/]+\/[^/]+)?$/);
};

const openKensetsu = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/kensetsu`);
  await ensureAppLoaded(page);
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe('#/kensetsu');
};

const openPool = async (page: Page): Promise<void> => {
  await page.goto(`${ipfsEntryUrl}#/pool`);
  await ensureAppLoaded(page);
  await expect.poll(async () => page.evaluate(() => window.location.hash)).toBe('#/pool');
};

const accountSelectWalletBaseSelector = '.s-modal__modal.account-select-dialog .dialog-card__content > .el-card.base';
const accountSelectWalletHeaderSelector = `${accountSelectWalletBaseSelector} > .el-card__header`;

const callWalletStore = async (page: Page, action: string, payload?: unknown): Promise<void> => {
  await page.evaluate(
    ({ action, payload }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const walletStore = pinia?._s?.get('wallet');

      return walletStore?.[action]?.(payload);
    },
    { action, payload }
  );
};

const callWeb3Store = async (page: Page, action: string, payload?: unknown): Promise<void> => {
  await page.evaluate(
    ({ action, payload }) => {
      const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
      const web3Store = pinia?._s?.get('web3-legacy') ?? pinia?._s?.get('web3');

      web3Store?.[action]?.(payload);
    },
    { action, payload }
  );
};

const enableNoirTheme = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const nextTheme = 'dark';
    document.documentElement.setAttribute('design-system-theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.body?.setAttribute('design-system-theme', nextTheme);
    if (document.body) {
      document.body.dataset.theme = nextTheme;
    }

    const provider = document.querySelector('.sora-theme-provider');
    provider?.setAttribute('design-system-theme', nextTheme);
    provider?.setAttribute('data-theme', nextTheme);
  });
  await callWalletStore(page, 'setTheme', 'dark');
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.getAttribute('design-system-theme')))
    .toBe('dark');
};

const getRgbChannels = (value: string): number[][] => {
  return [...value.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)].map((match) => match.slice(1).map(Number));
};

const expectShadowShape = (boxShadow: string): void => {
  const colorChannels = getRgbChannels(boxShadow);

  expect(colorChannels.length).toBeGreaterThanOrEqual(2);
  expect(boxShadow).toContain('1px 1px 5px 0px');
  expect(boxShadow).toContain('-1px -1px 5px 0px');
};

const expectRgbNear = (color: string, expected: [number, number, number], tolerance = 5): void => {
  const channels = getRgbChannels(color)[0];

  expect(channels).toHaveLength(3);
  channels.forEach((channel, index) => {
    expect(Math.abs(channel - expected[index])).toBeLessThanOrEqual(tolerance);
  });
};

const expectRgbInPalette = (color: string, palette: Array<[number, number, number]>, tolerance = 8): void => {
  const channels = getRgbChannels(color)[0];
  const message = palette.length
    ? `Expected ${color} to be within ${tolerance} RGB units of one palette value: ${palette
        .map((value) => `rgb(${value.join(', ')})`)
        .join(', ')}`
    : `Expected ${color} to match a non-empty palette`;

  expect(channels).toHaveLength(3);
  expect(
    palette.some((expected) => channels.every((channel, index) => Math.abs(channel - expected[index]) <= tolerance)),
    message
  ).toBe(true);
};

/** Checks the rendered text or control contrast while allowing intentional theme palette changes. */
const expectContrast = (foreground: string, background: string, minimum = 4.5): void => {
  const luminance = (color: string): number => {
    const channels = getRgbChannels(color)[0];
    expect(channels, `Expected an opaque rendered RGB color, received ${color}`).toHaveLength(3);
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  expect(ratio, `${foreground} on ${background} should meet ${minimum}:1 contrast`).toBeGreaterThanOrEqual(minimum);
};

const waitForNextPaint = async (page: Page): Promise<void> => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      })
  );
};

test.beforeEach(async ({ page }) => {
  await preparePage(page, { stubRuntimeEnv: true });
});

test('keeps manual announcement controls centered and keyboard operable', async ({ page }) => {
  const consoleErrors = trackConsole(page);
  await openSwap(page);
  await page.evaluate(() => {
    const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
    pinia?._s?.get('settings')?.setAdsArray([
      { title: 'First announcement', img: '', link: '#/swap' },
      { title: 'Second announcement', img: '', link: '#/trade' },
    ]);
  });

  const announcements = page.getByRole('navigation', { name: 'Announcements' });
  const previous = announcements.getByRole('button', { name: 'Previous announcement' });
  const next = announcements.getByRole('button', { name: 'Next announcement' });
  await expect(announcements.getByRole('link', { name: 'First announcement' })).toHaveAttribute('href', '#/swap');

  const controls = await announcements.evaluate((nav) => {
    const navRect = nav.getBoundingClientRect();
    return Array.from(nav.querySelectorAll('button')).map((button) => {
      const rect = button.getBoundingClientRect();
      const iconRect = button.querySelector('i')?.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        centerDelta: Math.abs(rect.top + rect.height / 2 - navRect.top - navRect.height / 2),
        iconCenterDelta: iconRect
          ? Math.abs(iconRect.top + iconRect.height / 2 - rect.top - rect.height / 2)
          : Number.POSITIVE_INFINITY,
      };
    });
  });
  expect(controls).toHaveLength(2);
  for (const control of controls) {
    expect(control.width).toBeGreaterThanOrEqual(32);
    expect(control.height).toBeGreaterThanOrEqual(36);
    expect(control.centerDelta).toBeLessThanOrEqual(1);
    expect(control.iconCenterDelta).toBeLessThanOrEqual(2);
  }

  await next.click();
  await expect(announcements.getByRole('link', { name: 'Second announcement' })).toHaveAttribute('href', '#/trade');
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(announcements.getByRole('link', { name: 'First announcement' })).toBeVisible();
  await previous.click();
  await expect(announcements.getByRole('link', { name: 'Second announcement' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

for (const width of [1025, 1200]) {
  test(`keeps the desktop chart beside Swap at ${width}px without saving responsive geometry`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openSwap(page);
    const readSavedLayouts = () =>
      page.evaluate(() =>
        Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.includes('swapGrid:v3')))
      );
    const saved = await readSavedLayouts();

    await page.setViewportSize({ width, height: 1000 });
    const form = page.locator('[data-widget-id="swapForm"]');
    const chart = page.locator('[data-widget-id="swapChart"]');
    await expect(form).toBeVisible();
    await expect(chart).toBeVisible();
    await expect(page.locator('.swap-chart-disclosure')).toHaveCount(0);
    await expect
      .poll(async () => {
        const formBox = await form.boundingBox();
        const chartBox = await chart.boundingBox();
        if (!formBox || !chartBox) return false;
        return (
          formBox.x + formBox.width <= chartBox.x + 1 &&
          Math.abs(formBox.y - chartBox.y) <= 1 &&
          Math.abs(formBox.width - chartBox.width) <= 1
        );
      })
      .toBe(true);
    expect(await readSavedLayouts()).toEqual(saved);
  });
}

test('keeps trade connect-account button labels fully visible', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openTrade(page);
  await expect(page.locator('.order-book-connect-btn').first()).toBeVisible({ timeout: 15_000 });

  const metrics = await page.evaluate(() => {
    const visibleButtons = Array.from(document.querySelectorAll('.order-book-connect-btn')).filter((entry) => {
      const element = entry as HTMLElement;
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';
    }) as HTMLElement[];

    const issues: string[] = [];

    visibleButtons.forEach((button, index) => {
      const label = (button.querySelector('.s-button__text') ?? button.querySelector('span')) as HTMLElement | null;
      if (!label) {
        issues.push(`button-${index}:missing-label`);
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      const isOutsideVerticalBounds = labelRect.top < buttonRect.top - 1 || labelRect.bottom > buttonRect.bottom + 1;
      const hasVerticalClip = label.scrollHeight - label.clientHeight > 2;
      const hasHorizontalClip = label.scrollWidth - label.clientWidth > 2;

      if (isOutsideVerticalBounds || hasVerticalClip || hasHorizontalClip) {
        issues.push(
          `button-${index}:outside=${String(isOutsideVerticalBounds)}:vclip=${String(hasVerticalClip)}:hclip=${String(hasHorizontalClip)}`
        );
      }
    });

    return {
      count: visibleButtons.length,
      issues,
    };
  });

  expect(metrics.count).toBeGreaterThan(0);
  expect(metrics.issues).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('keeps swap account-connect modal content aligned with dialog frame', async ({ page }) => {
  await openSwap(page);

  const connectButton = page.locator('.swap-form .action-button', { hasText: /connect account/i }).first();
  await expect(connectButton).toBeVisible({ timeout: 15_000 });
  await connectButton.click();
  await expect(page.locator(accountSelectWalletBaseSelector)).toBeVisible({ timeout: 15_000 });

  const geometry = await page.evaluate(() => {
    const dialogCard = document.querySelector(
      '.s-modal__modal.account-select-dialog .dialog-card'
    ) as HTMLElement | null;
    const walletBase = document.querySelector(
      '.s-modal__modal.account-select-dialog .dialog-card__content > .el-card.base'
    ) as HTMLElement | null;

    if (!dialogCard || !walletBase) {
      return {
        ready: false,
        widthDelta: null,
        rowOverflows: [],
        cardPadding: null,
        bodyPadding: null,
        dialogCardShadow: null,
        dialogCardBackground: null,
      };
    }

    const dialogRect = dialogCard.getBoundingClientRect();
    const walletRect = walletBase.getBoundingClientRect();
    const walletBody = walletBase.querySelector(':scope > .el-card__body') as HTMLElement | null;
    const rowOverflows = Array.from(walletBase.querySelectorAll('.account-card')).map((row) => {
      const rowRect = (row as HTMLElement).getBoundingClientRect();
      return rowRect.right - dialogRect.right;
    });
    const cardStyles = getComputedStyle(walletBase);
    const bodyStyles = walletBody ? getComputedStyle(walletBody) : null;
    const dialogStyles = getComputedStyle(dialogCard);

    return {
      ready: true,
      widthDelta: Math.abs(dialogRect.width - walletRect.width),
      rowOverflows,
      cardPadding: {
        top: Number.parseFloat(cardStyles.paddingTop),
        right: Number.parseFloat(cardStyles.paddingRight),
        bottom: Number.parseFloat(cardStyles.paddingBottom),
        left: Number.parseFloat(cardStyles.paddingLeft),
      },
      bodyPadding: bodyStyles
        ? {
            top: Number.parseFloat(bodyStyles.paddingTop),
            right: Number.parseFloat(bodyStyles.paddingRight),
            bottom: Number.parseFloat(bodyStyles.paddingBottom),
            left: Number.parseFloat(bodyStyles.paddingLeft),
          }
        : null,
      dialogCardShadow: dialogStyles.boxShadow,
      dialogCardBackground: dialogStyles.backgroundColor,
    };
  });

  expect(geometry.ready).toBe(true);
  expect(geometry.widthDelta).not.toBeNull();
  expect(geometry.widthDelta ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect((geometry.rowOverflows ?? []).every((overflow) => overflow <= 1)).toBe(true);
  expect(geometry.cardPadding).toEqual({
    top: 24,
    right: 24,
    bottom: 32,
    left: 24,
  });
  expect(geometry.bodyPadding).toEqual({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  expect(geometry.dialogCardShadow).toBe('none');
  expect(geometry.dialogCardBackground).toBe('rgba(0, 0, 0, 0)');
});

test('keeps swap account-connect modal typography on Sora font stack', async ({ page }) => {
  await openSwap(page);

  const connectButton = page.locator('.swap-form .action-button', { hasText: /connect account/i }).first();
  await expect(connectButton).toBeVisible({ timeout: 15_000 });
  await connectButton.click();
  await expect(page.locator('.account-select-dialog .el-card.base')).toBeVisible({ timeout: 15_000 });

  const fonts = await page.evaluate(() => {
    const selectors = {
      modal: '.account-select-dialog',
      card: '.account-select-dialog .el-card.base',
      title: '.account-select-dialog .base-title_text',
      learnMore: '.account-select-dialog .wallet-connection-text',
      section: '.account-select-dialog .wallet-connection-title',
      itemTitle: '.account-select-dialog .extension-name',
      actionLabel: '.account-select-dialog .connection-action .s-button__text',
    } as const;

    const result = {} as Record<string, string>;

    for (const [key, selector] of Object.entries(selectors)) {
      const element = document.querySelector(selector) as HTMLElement | null;
      result[key] = element ? getComputedStyle(element).fontFamily : '';
    }

    return result;
  });

  expect(fonts.modal).toContain('Sora');
  expect(fonts.card).toContain('Sora');
  expect(fonts.title).toContain('Sora');
  expect(fonts.learnMore).toContain('Sora');

  for (const key of ['section', 'itemTitle', 'actionLabel'] as const) {
    if (fonts[key]) {
      expect(fonts[key]).toContain('Sora');
    }
  }
});

test('keeps burn account-connect modal content clipped on the right edge', async ({ page }) => {
  await openBurn(page);

  const connectButton = page
    .locator('.burn-container .action-button', { hasText: /connect (wallet|account)/i })
    .first();
  await expect(connectButton).toBeVisible({ timeout: 15_000 });
  await callWeb3Store(page, 'setSoraAccountDialogVisibility', true);
  await expect(page.locator('.s-modal__modal.account-select-dialog .dialog-card')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(accountSelectWalletBaseSelector)).toBeVisible({ timeout: 15_000 });

  const geometry = await page.evaluate(() => {
    const dialogCard = document.querySelector(
      '.s-modal__modal.account-select-dialog .dialog-card'
    ) as HTMLElement | null;
    const dialogContent = document.querySelector(
      '.s-modal__modal.account-select-dialog .dialog-card__content'
    ) as HTMLElement | null;
    const walletBase = document.querySelector(
      '.s-modal__modal.account-select-dialog .dialog-card__content > .el-card.base'
    ) as HTMLElement | null;
    const scrollWrap = document.querySelector(
      '.s-modal__modal.account-select-dialog .connection-items.el-scrollbar > .el-scrollbar__wrap'
    ) as HTMLElement | null;

    if (!dialogCard || !dialogContent) {
      return {
        ready: false,
        widthDelta: null,
        maxChildOverflowRight: null,
        contentOverflowX: null,
        contentOverflowY: null,
        scrollWrapOverflowY: null,
      };
    }

    const dialogRect = dialogCard.getBoundingClientRect();
    const walletRect = walletBase?.getBoundingClientRect();
    const maxChildOverflowRight = Array.from(dialogContent.querySelectorAll('*')).reduce((maxOverflow, node) => {
      const element = node as HTMLElement;
      const rect = element.getBoundingClientRect();
      const overflow = rect.right - dialogRect.right;
      return Math.max(maxOverflow, overflow);
    }, Number.NEGATIVE_INFINITY);
    const contentStyles = getComputedStyle(dialogContent);
    const scrollWrapStyles = scrollWrap ? getComputedStyle(scrollWrap) : null;

    return {
      ready: true,
      widthDelta: walletRect ? Math.abs(dialogRect.width - walletRect.width) : 0,
      maxChildOverflowRight,
      contentOverflowX: contentStyles.overflowX,
      contentOverflowY: contentStyles.overflowY,
      scrollWrapOverflowY: scrollWrapStyles?.overflowY ?? null,
    };
  });

  expect(geometry.ready).toBe(true);
  expect(geometry.widthDelta).not.toBeNull();
  expect(geometry.widthDelta ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(geometry.maxChildOverflowRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  expect(geometry.contentOverflowX).toBe('hidden');
  expect(geometry.contentOverflowY).toBe('hidden');
  if (geometry.scrollWrapOverflowY !== null) {
    expect(geometry.scrollWrapOverflowY).toBe('auto');
  }
});

test('keeps wallet connect card header border reset aligned with production', async ({ page }) => {
  await openSwap(page);

  const connectButton = page.locator('.swap-form .action-button', { hasText: /connect account/i }).first();
  await expect(connectButton).toBeVisible({ timeout: 15_000 });
  await connectButton.click();
  await expect(page.locator(accountSelectWalletHeaderSelector)).toBeVisible({ timeout: 15_000 });

  const headerBorder = await page.evaluate(() => {
    const header = document.querySelector(
      '.container--wallet .base > .el-card__header, .account-select-dialog .dialog-card__content > .el-card.base > .el-card__header'
    ) as HTMLElement | null;
    if (!header) return null;

    const styles = getComputedStyle(header);
    return {
      borderStyle: styles.borderStyle,
      borderTopStyle: styles.borderTopStyle,
      borderTopWidth: styles.borderTopWidth,
      borderBottomStyle: styles.borderBottomStyle,
      borderBottomWidth: styles.borderBottomWidth,
      borderBottomColor: styles.borderBottomColor,
    };
  });

  expect(headerBorder).not.toBeNull();
  expect(headerBorder?.borderStyle).toBe('none none solid');
  expect(headerBorder?.borderTopStyle).toBe('none');
  expect(headerBorder?.borderTopWidth).toBe('0px');
  expect(headerBorder?.borderBottomStyle).toBe('solid');
  expect(headerBorder?.borderBottomWidth).toBe('1px');
  expect(headerBorder?.borderBottomColor).toBe('rgba(0, 0, 0, 0)');
});

test('keeps swap route widget with visible bottom spacing', async ({ page }) => {
  await openSwap(page);

  const spacing = await page.evaluate(() => {
    const routeWidget = Array.from(document.querySelectorAll('.base-widget')).find((widget) => {
      const title = widget.querySelector('.base-widget-title')?.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
      return title === 'route';
    }) as HTMLElement | undefined;

    if (!routeWidget) return { ready: false, contentBottomGap: null };

    const content = routeWidget.querySelector('.base-widget-content') as HTMLElement | null;
    const distribution = routeWidget.querySelector('.distribution') as HTMLElement | null;
    const steps = distribution ? Array.from(distribution.querySelectorAll('.distribution-step')) : [];
    const lastStep = steps.length ? (steps[steps.length - 1] as HTMLElement) : null;

    if (!content || !distribution || !lastStep) {
      return { ready: false, contentBottomGap: null };
    }

    const contentRect = content.getBoundingClientRect();
    const lastStepRect = lastStep.getBoundingClientRect();
    const distributionStyles = getComputedStyle(distribution);
    const lastStepStyles = getComputedStyle(lastStep);

    return {
      ready: true,
      distributionTag: distribution.tagName,
      contentBottomGap: Math.round(contentRect.bottom - lastStepRect.bottom),
      contentPaddingBottom: Math.round(Number.parseFloat(getComputedStyle(content).paddingBottom)),
      distributionPaddingBottom: Math.round(Number.parseFloat(distributionStyles.paddingBottom)),
      distributionMarginBottom: Math.round(Number.parseFloat(getComputedStyle(distribution).marginBottom)),
      lastStepMarginBottom: Math.round(Number.parseFloat(lastStepStyles.marginBottom)),
    };
  });

  expect(spacing.ready).toBe(true);
  expect(['DIV', 'UL']).toContain(spacing.distributionTag);
  expect(spacing.contentBottomGap).not.toBeNull();
  expect(spacing.contentPaddingBottom).toBe(16);
  expect(spacing.distributionPaddingBottom).toBe(8);
  expect(spacing.distributionMarginBottom).toBe(0);
  expect(spacing.lastStepMarginBottom).toBe(0);
  expect(spacing.contentBottomGap ?? 0).toBeGreaterThanOrEqual(16);
});

test('uses the production polkaswap loader styling for loading indicators', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openSwap(page);

  const styles = await page.evaluate(() => {
    const mask = document.createElement('div');
    mask.className = 'el-loading-mask';

    const spinner = document.createElement('div');
    spinner.className = 'el-loading-spinner';
    mask.appendChild(spinner);
    document.body.appendChild(mask);

    const spinnerStyles = getComputedStyle(spinner);

    const overlaySpinner = document.createElement('div');
    overlaySpinner.className = 'app-loading-overlay__spinner';
    document.body.appendChild(overlaySpinner);

    const overlayStyles = getComputedStyle(overlaySpinner);

    const directiveOverlay = document.createElement('div');
    directiveOverlay.className = 'app-loading-overlay el-loading-mask';

    const directiveSpinner = document.createElement('div');
    directiveSpinner.className = 'app-loading-overlay__spinner el-loading-spinner';
    directiveOverlay.appendChild(directiveSpinner);
    document.body.appendChild(directiveOverlay);

    const directiveStyles = getComputedStyle(directiveSpinner);

    const result = {
      spinnerBackgroundImage: spinnerStyles.backgroundImage,
      spinnerAnimationName: spinnerStyles.animationName,
      spinnerAnimationDuration: spinnerStyles.animationDuration,
      overlayBackgroundImage: overlayStyles.backgroundImage,
      overlayAnimationName: overlayStyles.animationName,
      overlayAnimationDuration: overlayStyles.animationDuration,
      directiveMarginLeft: directiveStyles.marginLeft,
      directiveMarginTop: directiveStyles.marginTop,
    };

    mask.remove();
    overlaySpinner.remove();
    directiveOverlay.remove();

    return result;
  });

  expect(styles.spinnerBackgroundImage).toMatch(/pswap-loader(?:-[^)"']+)?\.svg/);
  expect(styles.spinnerAnimationName).toBe('none');
  expect(styles.spinnerAnimationDuration).toBe('0s');
  expect(styles.overlayBackgroundImage).toMatch(/pswap-loader(?:-[^)"']+)?\.svg/);
  expect(styles.overlayAnimationName).toBe('none');
  expect(styles.overlayAnimationDuration).toBe('0s');
  expect(Number.parseFloat(styles.directiveMarginLeft)).toBeGreaterThan(0);
  expect(Number.parseFloat(styles.directiveMarginTop)).toBeLessThan(0);
  expect(consoleErrors).toEqual([]);
});

test('keeps the swap token header row stretched to the full input width', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openSwap(page);
  await expect(page.locator('.swap-form .s-input.token-input .s-input__top').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.swap-form .s-input.token-input .input-line').first()).toBeVisible({ timeout: 15_000 });
  await waitForNextPaint(page);

  const metrics = await page.evaluate(() => {
    const tokenInput = document.querySelector('.swap-form .s-input.token-input') as HTMLElement | null;
    const header = document.querySelector('.swap-form .s-input.token-input .s-input__top') as HTMLElement | null;
    const inputLine = document.querySelector('.swap-form .s-input.token-input .input-line') as HTMLElement | null;

    if (!tokenInput || !header || !inputLine) {
      return null;
    }

    const inputRect = tokenInput.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const lineRect = inputLine.getBoundingClientRect();

    return {
      inputWidth: Math.round(inputRect.width),
      headerWidth: Math.round(headerRect.width),
      lineWidth: Math.round(lineRect.width),
      headerDelta: Math.round(headerRect.width - lineRect.width),
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.headerWidth).toBeGreaterThan(250);
  expect(metrics?.lineWidth).toBeGreaterThan(250);
  expect((metrics?.headerDelta ?? Number.POSITIVE_INFINITY) <= 4).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('keeps the swap fiat price aligned with the token amount input', async ({ page }) => {
  const consoleErrors = trackConsole(page);

  await openSwap(page);
  await expect(page.locator('.swap-form .s-input.token-input').first()).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () =>
      page.evaluate((xorAddress) => {
        const pinia = (window as Record<string, any>).__PS_ACTIVE_PINIA__;
        const walletStore = pinia?._s?.get('wallet');

        if (!walletStore?.accountState) {
          return false;
        }

        walletStore.accountState.fiatPriceObject = Object.freeze({ [xorAddress]: '1000000000000000000' });
        return walletStore.fiatPriceObject?.[xorAddress] === '1000000000000000000';
      }, XOR_ADDRESS)
    )
    .toBe(true);
  await expect(page.locator('.swap-form .token-input--fiat').first()).toBeVisible({ timeout: 15_000 });

  const metrics = await page.evaluate(() => {
    const tokenInput = document.querySelector('.swap-form .s-input.token-input') as HTMLElement | null;
    const amountInput = tokenInput?.querySelector(':scope > .s-input__content .el-input__inner') as HTMLElement | null;
    const fiatInput = tokenInput?.querySelector('.token-input--fiat') as HTMLElement | null;
    const fiatContent = fiatInput?.querySelector(':scope > .s-input__content') as HTMLElement | null;
    const fiatPrefix = fiatInput?.querySelector('.input-prefix') as HTMLElement | null;
    const fiatValue = fiatInput?.querySelector('.el-input__inner') as HTMLElement | null;

    if (!amountInput || !fiatInput || !fiatContent || !fiatPrefix || !fiatValue) {
      return null;
    }

    const amountRect = amountInput.getBoundingClientRect();
    const fiatContentRect = fiatContent.getBoundingClientRect();
    const fiatPrefixRect = fiatPrefix.getBoundingClientRect();
    const fiatInputStyles = getComputedStyle(fiatInput);
    const fiatContentStyles = getComputedStyle(fiatContent);
    const fiatPrefixStyles = getComputedStyle(fiatPrefix);
    const fiatValueStyles = getComputedStyle(fiatValue);

    return {
      amountLeft: Math.round(amountRect.left),
      fiatContentLeft: Math.round(fiatContentRect.left),
      fiatPrefixLeft: Math.round(fiatPrefixRect.left),
      fiatInputColor: fiatInputStyles.color,
      fiatContentColor: fiatContentStyles.color,
      fiatPrefixColor: fiatPrefixStyles.color,
      fiatValueColor: fiatValueStyles.color,
      fiatContentPaddingLeft: fiatContentStyles.paddingLeft,
      fiatContentPaddingRight: fiatContentStyles.paddingRight,
    };
  });

  expect(metrics).not.toBeNull();
  const fiatPrefixOffset = Math.abs((metrics?.fiatPrefixLeft ?? 0) - (metrics?.amountLeft ?? Number.POSITIVE_INFINITY));

  expect(fiatPrefixOffset).toBeLessThanOrEqual(1);
  expect(metrics?.fiatContentLeft).toBe(metrics?.amountLeft);
  expect(metrics?.fiatContentPaddingLeft).toBe('0px');
  expect(metrics?.fiatContentPaddingRight).toBe('0px');
  expect(metrics?.fiatInputColor).toBe('rgb(31, 101, 164)');
  expect(metrics?.fiatContentColor).toBe('rgb(31, 101, 164)');
  expect(metrics?.fiatPrefixColor).toBe('rgb(31, 101, 164)');
  expect(metrics?.fiatValueColor).toBe('rgb(31, 101, 164)');
  expect(consoleErrors).toEqual([]);
});

test('uses Sora as the swap text typeface on swap surface', async ({ page }) => {
  await openSwap(page);

  const fonts = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const app = getComputedStyle(document.querySelector('#app') as HTMLElement);
    const title = getComputedStyle(document.querySelector('.base-widget-title') as HTMLElement);
    const actionButton = getComputedStyle(document.querySelector('.swap-form .action-button') as HTMLElement);

    return {
      vars: {
        default: root.getPropertyValue('--s-font-family-default').trim(),
        mono: root.getPropertyValue('--s-font-family-mono').trim(),
        icons: root.getPropertyValue('--s-font-family-icons').trim(),
      },
      bodyFont: body.fontFamily,
      appFont: app.fontFamily,
      titleFont: title.fontFamily,
      actionButtonFont: actionButton.fontFamily,
    };
  });

  expect(fonts.vars.default).toBe('Sora,sans-serif');
  expect(fonts.vars.mono).toBe('Sora,sans-serif');
  expect(fonts.vars.icons).toBe('soramitsu-icons');
  expect(fonts.appFont).toContain('Sora');
  expect(fonts.titleFont).toContain('Sora');
  expect(fonts.actionButtonFont).toContain('Sora');
});

test('keeps market algorithm settings popup visuals aligned with production contract', async ({ page }) => {
  await openSwap(page);

  const settingsButton = page.locator('.el-button--settings').first();
  await expect(settingsButton).toBeVisible({ timeout: 15_000 });
  await settingsButton.click();
  await expect(page.locator('.market-algorithm').first()).toBeVisible({ timeout: 15_000 });
  await waitForNextPaint(page);
  await page.waitForTimeout(600);

  const styles = await page.evaluate(() => {
    const market = document.querySelector('.market-algorithm') as HTMLElement | null;
    const dialogSurface = market?.closest('.dialog-card, .el-dialog') as HTMLElement | null;
    const dialogContainer = market?.closest('[role="dialog"]') as HTMLElement | null;
    const dialog = dialogSurface ?? dialogContainer;
    const header = dialog?.querySelector('.el-dialog__header, .dialog-card__header') as HTMLElement | null;
    const title = dialog?.querySelector('.el-dialog__title, .dialog-card__title-text') as HTMLElement | null;
    const close = dialog?.querySelector('.el-dialog__close, .dialog-card__close') as HTMLElement | null;
    const content = dialog?.querySelector('.el-dialog__body, .dialog-card__content') as HTMLElement | null;
    const hint = market?.querySelector('.settings-header-hint') as HTMLElement | null;
    const activeTab = market?.querySelector('.settings-tabs .el-tabs__item.is-active') as HTMLElement | null;

    if (!market || !dialog || !header || !title || !close || !content || !hint || !activeTab) {
      return null;
    }

    const read = (node: HTMLElement) => {
      const box = node.getBoundingClientRect();
      const styles = getComputedStyle(node);
      return {
        width: Math.round(box.width),
        height: Math.round(box.height),
        padding: styles.padding,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
      };
    };

    return {
      dialog: read(dialog),
      header: read(header),
      title: read(title),
      close: read(close),
      content: read(content),
      hint: read(hint),
      activeTab: read(activeTab),
    };
  });

  expect(styles).not.toBeNull();
  expect(styles?.dialog.width ?? 0).toBeGreaterThanOrEqual(360);
  expect(styles?.dialog.width ?? 0).toBeLessThanOrEqual(496);
  expect(styles?.dialog.borderRadius).toBe('24px');
  expect(styles?.dialog.backgroundColor).toBe('rgb(253, 247, 251)');
  expect(styles?.dialog.boxShadow).toBe(
    'rgb(255, 255, 255) -5px -5px 10px 0px, rgba(0, 0, 0, 0.1) 1px 1px 10px 0px, rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset'
  );

  expect(styles?.header.padding).toBe('24px 24px 8px');

  expect(styles?.title.fontSize).toBe('24px');
  expect(styles?.title.fontWeight).toBe('300');
  expect(styles?.title.lineHeight).toBe('31.2px');

  expect(styles?.close.width ?? 0).toBeGreaterThanOrEqual(32);
  expect(styles?.close.width ?? 0).toBeLessThanOrEqual(42);
  expect(styles?.close.height ?? 0).toBeGreaterThanOrEqual(32);
  expect(styles?.close.height ?? 0).toBeLessThanOrEqual(42);
  expect(styles?.close.borderRadius).toBe('24px');
  expect(styles?.close.backgroundColor).toBe('rgb(247, 243, 244)');
  expectContrast(styles?.close.color ?? '', styles?.close.backgroundColor ?? '');
  expect(styles?.close.boxShadow).toBe(
    'rgb(255, 255, 255) -5px -5px 10px 0px, rgba(0, 0, 0, 0.1) 1px 1px 10px 0px, rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset'
  );

  expect(styles?.content.padding).toBe('8px 24px 24px');

  expectContrast(styles?.hint.color ?? '', styles?.dialog.backgroundColor ?? '');

  expect(styles?.activeTab.boxShadow).toBe(
    'rgb(255, 255, 255) -5px -5px 10px 0px, rgba(0, 0, 0, 0.1) 1px 1px 10px 0px, rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset'
  );
});

test('keeps swap reverse button depth behavior aligned with production in light and noir modes', async ({ page }) => {
  await openSwap(page);

  const readSwitchStyles = async () => {
    type SwitchStyleState = {
      boxShadow: string;
      backgroundColor: string;
      borderColor: string;
      color: string;
    };

    const button = page.locator('.el-button--switch-tokens').first();
    await expect(button).toBeVisible();

    const read = async (): Promise<SwitchStyleState> =>
      button.evaluate((node) => {
        const styles = getComputedStyle(node as HTMLElement);
        return {
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
          color: styles.color,
        };
      });

    const before = await button.evaluate((node) => ({
      disabledAttr: node.hasAttribute('disabled'),
      disabledProp: (node as HTMLButtonElement).disabled,
      hasDisabledClass: node.classList.contains('is-disabled'),
      hasButtonDisabledClass: node.classList.contains('s-button_disabled'),
    }));

    const disabled = await read();

    await button.evaluate((node) => {
      node.removeAttribute('disabled');
      (node as HTMLButtonElement).disabled = false;
      node.classList.remove('is-disabled');
      node.classList.remove('s-button_disabled');
    });

    await page.waitForTimeout(180);
    const enabled = await read();

    const box = await button.boundingBox();
    if (!box) return null;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);
    const active = await read();
    await page.mouse.up();

    await button.evaluate((node, state) => {
      if (state.disabledAttr) {
        node.setAttribute('disabled', '');
      } else {
        node.removeAttribute('disabled');
      }

      (node as HTMLButtonElement).disabled = state.disabledProp;
      node.classList.toggle('is-disabled', state.hasDisabledClass);
      node.classList.toggle('s-button_disabled', state.hasButtonDisabledClass);
    }, before);

    return {
      disabled,
      enabled,
      active,
    };
  };

  const assertStateMatchesDesignSystem = (state: Awaited<ReturnType<typeof readSwitchStyles>>) => {
    expect(state).not.toBeNull();
    expect(state?.active.boxShadow).not.toBe(state?.enabled.boxShadow);
    expect(state?.active.boxShadow.length ?? 0).toBeGreaterThan(0);
    expect(state?.disabled.backgroundColor).toBe(state?.enabled.backgroundColor);
    expect(state?.enabled.backgroundColor).toBe(state?.active.backgroundColor);
    expect(state?.active.borderColor).toBe(state?.enabled.borderColor);
    expect(state?.active.color).not.toBe(state?.enabled.color);
  };

  const light = await readSwitchStyles();
  assertStateMatchesDesignSystem(light);

  await enableNoirTheme(page);
  const dark = await readSwitchStyles();
  assertStateMatchesDesignSystem(dark);
});

test('keeps swap noir shadows and highlights aligned with production palette', async ({ page }) => {
  await openSwap(page);
  await expect(page.locator('.swap-form .action-button').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.swap-form .token-select-button').first()).toBeVisible({ timeout: 15_000 });
  await enableNoirTheme(page);
  await expect(page.locator('.swap-form .action-button').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.swap-form .token-select-button').first()).toBeVisible({ timeout: 15_000 });
  const primaryAction = page.locator('.swap-form .action-button').first();

  await primaryAction.evaluate((node) => (node as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await expect
    .poll(async () => primaryAction.evaluate((node) => getComputedStyle(node).borderColor))
    .toBe('rgb(105, 61, 129)');

  // Theme variables switch immediately, while the enabled text color transitions for 125ms.
  await expect(primaryAction).toHaveCSS('color', 'rgb(47, 10, 73)');

  const styles = await page.evaluate(() => {
    const primaryAction = document.querySelector('.swap-form .action-button') as HTMLElement | null;
    const tokenSelect = document.querySelector('.swap-form .token-select-button') as HTMLElement | null;

    if (!primaryAction || !tokenSelect) {
      return null;
    }

    const primary = getComputedStyle(primaryAction);
    const token = getComputedStyle(tokenSelect);

    return {
      primaryAction: {
        boxShadow: primary.boxShadow,
        backgroundColor: primary.backgroundColor,
        borderColor: primary.borderColor,
        color: primary.color,
      },
      tokenSelect: {
        boxShadow: token.boxShadow,
        backgroundColor: token.backgroundColor,
        borderColor: token.borderColor,
        color: token.color,
      },
    };
  });

  expect(styles).not.toBeNull();
  expectShadowShape(styles?.primaryAction.boxShadow ?? '');
  expectRgbInPalette(styles?.primaryAction.backgroundColor ?? '', [
    [248, 8, 123],
    [242, 65, 151],
    [247, 84, 163],
  ]);
  expectRgbInPalette(styles?.primaryAction.borderColor ?? '', [
    [237, 228, 231],
    [105, 61, 129],
  ]);
  expectContrast(styles?.primaryAction.color ?? '', styles?.primaryAction.backgroundColor ?? '');

  await primaryAction.hover();
  await page.waitForTimeout(1_000);

  const hoverStyles = await primaryAction.evaluate((node) => {
    const primary = getComputedStyle(node);

    return {
      boxShadow: primary.boxShadow,
      backgroundColor: primary.backgroundColor,
      borderColor: primary.borderColor,
      color: primary.color,
    };
  });

  expectRgbNear(hoverStyles.backgroundColor, [247, 84, 163]);
  expectRgbNear(hoverStyles.borderColor, [89, 45, 113]);
  expectContrast(hoverStyles.color, hoverStyles.backgroundColor);

  expect(styles?.tokenSelect.boxShadow).toBe(
    'rgba(155, 111, 165, 0.25) -5px -5px 10px 0px, rgb(73, 32, 103) 2px 2px 15px 0px, rgba(155, 111, 165, 0.25) 1px 1px 2px 0px inset'
  );
  expectRgbNear(styles?.tokenSelect.backgroundColor ?? '', [93, 47, 115]);
  expect(styles?.tokenSelect.borderColor).toBe('rgba(0, 0, 0, 0)');
  expectContrast(styles?.tokenSelect.color ?? '', styles?.tokenSelect.backgroundColor ?? '');
});

test('keeps Kensetsu noir search surface aligned with production palette', async ({ page }) => {
  await openKensetsu(page);
  await expect(page.locator('.collaterals-search .search.search-input').first()).toBeVisible({ timeout: 15_000 });
  await enableNoirTheme(page);

  const styles = await page.evaluate(() => {
    const searchInput = document.querySelector('.collaterals-search .search.search-input') as HTMLElement | null;

    if (!searchInput) {
      return null;
    }

    const computed = getComputedStyle(searchInput);
    const bounds = searchInput.getBoundingClientRect();

    return {
      boxShadow: computed.boxShadow,
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      color: computed.color,
      height: Math.round(bounds.height),
    };
  });

  expect(styles).not.toBeNull();
  expect(styles?.boxShadow).toBe(
    'rgba(255, 255, 255, 0.1) 1px 1px 2px 0px, rgba(255, 255, 255, 0.05) -5px -5px 5px 0px inset, rgba(41, 0, 71, 0.33) 1px 1px 10px 0px inset'
  );
  expect(styles?.backgroundColor).toBe('rgb(73, 32, 103)');
  expect(styles?.borderColor).toBe('rgb(105, 61, 129)');
  expect(styles?.color).toBe('rgb(240, 215, 220)');
  expect(styles?.height).toBe(58);
});

test('keeps pool empty state aligned with production in light and noir modes', async ({ page }) => {
  await openPool(page);
  await expect(page.locator('.pool-info-container--empty').first()).toBeVisible({ timeout: 15_000 });

  const readPoolEmptyState = async () => {
    return page.evaluate(() => {
      const wrapper = document.querySelector('.pool-wrapper') as HTMLElement | null;
      const card = document.querySelector('.pool-info-container--empty') as HTMLElement | null;
      const button = document.querySelector(
        '.container.el-form--pool > button.el-button--primary'
      ) as HTMLElement | null;

      if (!wrapper || !card || !button) {
        return null;
      }

      const cardStyles = getComputedStyle(card);
      const buttonStyles = getComputedStyle(button);
      const cardRect = card.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      return {
        hasLegacyWrapper: Boolean(document.querySelector('.pool-empty-state')),
        wrapperText: wrapper.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        card: {
          backgroundColor: cardStyles.backgroundColor,
          color: cardStyles.color,
          borderColor: cardStyles.borderColor,
          borderRadius: cardStyles.borderRadius,
          boxShadow: cardStyles.boxShadow,
          padding: cardStyles.padding,
          fontSize: cardStyles.fontSize,
          lineHeight: cardStyles.lineHeight,
          letterSpacing: cardStyles.letterSpacing,
          width: Math.round(cardRect.width),
          height: Math.round(cardRect.height),
        },
        button: {
          text: button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          backgroundColor: buttonStyles.backgroundColor,
          color: buttonStyles.color,
          borderColor: buttonStyles.borderColor,
          borderRadius: buttonStyles.borderRadius,
          boxShadow: buttonStyles.boxShadow,
          padding: buttonStyles.padding,
          fontSize: buttonStyles.fontSize,
          lineHeight: buttonStyles.lineHeight,
          letterSpacing: buttonStyles.letterSpacing,
          width: Math.round(buttonRect.width),
          height: Math.round(buttonRect.height),
          marginTop: buttonStyles.marginTop,
        },
      };
    });
  };

  const light = await readPoolEmptyState();

  expect(light).not.toBeNull();
  expect(light?.hasLegacyWrapper).toBe(false);
  expect(light?.wrapperText).toBe('Connect an account to view your liquidity.');
  expect(light?.card.backgroundColor).toBe('rgb(253, 247, 251)');
  expectContrast(light?.card.color ?? '', light?.card.backgroundColor ?? '');
  expect(light?.card.borderColor).toBe('rgb(229, 231, 235)');
  expect(light?.card.borderRadius).toBe('24px');
  expect(light?.card.boxShadow).toBe(
    'rgb(255, 255, 255) -5px -5px 10px 0px, rgba(0, 0, 0, 0.1) 1px 1px 10px 0px, rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset'
  );
  expect(light?.card.padding).toBe('20px 24px');
  expect(light?.card.fontSize).toBe('14px');
  expect(light?.card.lineHeight).toBe('21px');
  expect(light?.card.letterSpacing).toBe('-0.28px');
  expect(light?.card.width).toBe(416);
  expect(light?.card.height).toBe(61);
  expect(light?.button.text).toBe('Connect account');
  expectContrast(light?.button.color ?? '', light?.button.backgroundColor ?? '');
  expect(light?.button.color).toBe('rgb(255, 255, 255)');
  expect(light?.button.borderColor).toBe('rgb(229, 231, 235)');
  expect(light?.button.borderRadius).toBe('24px');
  expect(light?.button.boxShadow).toBe('none');
  expect(light?.button.padding).toBe('5px 13px');
  expect(light?.button.fontSize).toBe('24px');
  expect(light?.button.lineHeight).toBe('24px');
  expect(light?.button.letterSpacing).toBe('normal');
  expect(light?.button.width).toBe(416);
  expect(light?.button.height).toBe(42);
  expect(light?.button.marginTop).toBe('16px');

  await enableNoirTheme(page);

  const dark = await readPoolEmptyState();

  expect(dark).not.toBeNull();
  expect(dark?.card.backgroundColor).toBe('rgb(89, 45, 113)');
  expectContrast(dark?.card.color ?? '', dark?.card.backgroundColor ?? '');
  expect(dark?.card.borderColor).toBe('rgb(229, 231, 235)');
  expect(dark?.card.boxShadow).toBe(
    'rgba(155, 111, 165, 0.25) -5px -5px 10px 0px, rgb(73, 32, 103) 2px 2px 15px 0px, rgba(155, 111, 165, 0.25) 1px 1px 2px 0px inset'
  );
  expect(dark?.card.padding).toBe('20px 24px');
  expect(dark?.card.fontSize).toBe('14px');
  expect(dark?.card.lineHeight).toBe('21px');
  expect(dark?.card.letterSpacing).toBe('-0.28px');
  expect(dark?.card.width).toBe(416);
  expect(dark?.card.height).toBe(61);
});

test('keeps swap hover highlights aligned with production in light and noir modes', async ({ page }) => {
  await openSwap(page);

  const readHoverStyles = async (selector: string) => {
    const locator = page.locator(selector).first();
    await expect(locator).toBeVisible({ timeout: 15_000 });
    const box = await locator.boundingBox();
    if (!box) return null;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1_000);

    return await locator.evaluate((node) => {
      const styles = getComputedStyle(node as HTMLElement);
      let surface: Element | null = node;
      let surfaceColor = styles.backgroundColor;
      while (surface && surfaceColor === 'rgba(0, 0, 0, 0)') {
        surface = surface.parentElement;
        if (surface) surfaceColor = getComputedStyle(surface).backgroundColor;
      }
      return {
        boxShadow: styles.boxShadow,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        color: styles.color,
        surfaceColor,
      };
    });
  };

  const lightPrimaryHover = await readHoverStyles('.swap-form .action-button');
  const lightTokenHover = await readHoverStyles('.swap-form .token-select-button');
  const lightSettingsHover = await readHoverStyles('.swap-widget .el-button--settings');

  expect(lightPrimaryHover).not.toBeNull();
  expect(lightPrimaryHover?.boxShadow).toBe(
    'rgba(255, 255, 255, 0.9) 1px 1px 5px 0px, rgb(255, 255, 255) -1px -1px 5px 0px, rgba(247, 84, 163, 0.16) 0px 0px 6.42111px 0px'
  );
  expectContrast(lightPrimaryHover?.color ?? '', lightPrimaryHover?.backgroundColor ?? '');
  expect(lightPrimaryHover?.borderColor).toBe('rgb(242, 234, 237)');
  expect(lightPrimaryHover?.color).toBe('rgb(255, 255, 255)');

  expect(lightTokenHover).not.toBeNull();
  expect(lightTokenHover?.boxShadow).toBe(
    'rgb(255, 255, 255) -5px -5px 10px 0px, rgba(0, 0, 0, 0.1) 1px 1px 10px 0px, rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset'
  );

  expect(lightSettingsHover).not.toBeNull();
  expect(lightSettingsHover?.borderColor).toBe('rgba(0, 0, 0, 0)');
  expectContrast(lightSettingsHover?.color ?? '', lightSettingsHover?.surfaceColor ?? '', 3);

  await enableNoirTheme(page);

  const darkPrimaryHover = await readHoverStyles('.swap-form .action-button');
  const darkTokenHover = await readHoverStyles('.swap-form .token-select-button');
  const darkSettingsHover = await readHoverStyles('.swap-widget .el-button--settings');

  expect(darkPrimaryHover).not.toBeNull();
  expect(darkPrimaryHover?.backgroundColor).toBe('rgb(247, 84, 163)');
  expectContrast(darkPrimaryHover?.color ?? '', darkPrimaryHover?.backgroundColor ?? '');

  expect(darkTokenHover).not.toBeNull();
  expect(darkTokenHover?.boxShadow).toBe(
    'rgba(155, 111, 165, 0.25) -5px -5px 10px 0px, rgb(73, 32, 103) 2px 2px 15px 0px, rgba(155, 111, 165, 0.25) 1px 1px 2px 0px inset'
  );

  expect(darkSettingsHover).not.toBeNull();
  expect(darkSettingsHover?.borderColor).toBe('rgba(0, 0, 0, 0)');
  expectContrast(darkSettingsHover?.color ?? '', darkSettingsHover?.surfaceColor ?? '', 3);
});

test('keeps swap token icon sizing aligned with production contract', async ({ page }) => {
  await openSwap(page);
  await expect(page.locator('.swap-form .token-select-button').first()).toBeVisible({ timeout: 15_000 });

  const readIcon = async (selector: string) => {
    return page.evaluate((target) => {
      const node = document.querySelector(target) as HTMLElement | null;
      if (!node) return null;

      const rect = node.getBoundingClientRect();
      const styles = getComputedStyle(node);

      return {
        className: node.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        lineHeight: styles.lineHeight,
        fontSize: styles.fontSize,
      };
    }, selector);
  };

  const selectedTokenIcon = await readIcon('.swap-form .token-select-button .asset-logo');

  expect(selectedTokenIcon).not.toBeNull();
  expect(selectedTokenIcon?.className).toContain('asset-logo--small');
  expect(selectedTokenIcon?.width).toBe(24);
  expect(selectedTokenIcon?.height).toBe(24);
  expect(selectedTokenIcon?.lineHeight).toBe('24px');
  expect(selectedTokenIcon?.fontSize).toBe('18px');
});

test('keeps the choose-token trigger on the production button contract', async ({ page }) => {
  await openSwap(page);

  const chooseToken = page.locator('.swap-form .token-select-button:not(.token-select-button--token)').first();
  await expect(chooseToken).toBeVisible({ timeout: 15_000 });

  const contract = await chooseToken.evaluate((button) => ({
    className: button.className,
    hasLegacyTextWrapper: Boolean(button.querySelector('.s-button__text')),
    textClassName: button.querySelector('.token-select-button__text')?.className ?? null,
    textFontSize: button.querySelector('.token-select-button__text')
      ? getComputedStyle(button.querySelector('.token-select-button__text') as Element).fontSize
      : null,
    textLineHeight: button.querySelector('.token-select-button__text')
      ? getComputedStyle(button.querySelector('.token-select-button__text') as Element).lineHeight
      : null,
  }));

  expect(contract.className).toContain('el-button');
  expect(contract.className).toContain('el-button--plain');
  expect(contract.className).toContain('s-secondary');
  expect(contract.className).not.toContain('s-button');
  expect(contract.className).not.toContain('sora-tpg-h7');
  expect(contract.hasLegacyTextWrapper).toBe(false);
  expect(contract.textClassName).toBe('token-select-button__text');
  expect(contract.textFontSize).toBe('12px');
  expect(contract.textLineHeight).toBe('12px');
});

test('keeps narrow-screen swap network fee details accessible before token selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.addInitScript(() => {
    Object.defineProperty(screen, 'orientation', {
      configurable: true,
      value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} },
    });
  });
  await openSwap(page);
  await expect(page.locator('.transaction-details').first()).toBeVisible({ timeout: 15_000 });

  const trigger = page.locator('.transaction-details').first();
  await expect(trigger).toHaveClass(/disabled/);

  await trigger.click();

  const inlineDetails = page.locator('.transaction-details-inline-content');
  await expect(inlineDetails).toHaveCount(1);
  await expect(inlineDetails).toContainText('Liquidity Provider Fee');
  await expect(page.locator('.transaction-details-popper')).toHaveCount(0);
});

test('keeps selected swap token colors aligned with production in light and noir modes', async ({ page }) => {
  await openSwap(page);
  await expect(page.locator('.swap-form .token-select-button.token-select-button--token').first()).toBeVisible({
    timeout: 15_000,
  });
  await waitForNextPaint(page);
  await page.waitForTimeout(600);

  const readSelectedTokenStyles = async () => {
    return await page.evaluate(() => {
      const button = document.querySelector(
        '.swap-form .token-select-button.token-select-button--token'
      ) as HTMLElement | null;
      const text = button?.querySelector('.token-select-button__text') as HTMLElement | null;

      if (!button || !text) return null;

      const buttonStyles = getComputedStyle(button);
      const textStyles = getComputedStyle(text);

      return {
        buttonColor: buttonStyles.color,
        buttonBackgroundColor: buttonStyles.backgroundColor,
        buttonBorderRadius: buttonStyles.borderRadius,
        textColor: textStyles.color,
      };
    });
  };

  const light = await readSelectedTokenStyles();

  expect(light).not.toBeNull();
  expectContrast(light?.buttonColor ?? '', light?.buttonBackgroundColor ?? '');
  expectRgbInPalette(light?.buttonBackgroundColor ?? '', neutralSurfacePalette, 2);
  expect(light?.buttonBorderRadius).toBe('16px');
  expectRgbNear(light?.textColor ?? '', [42, 23, 31], 2);

  await enableNoirTheme(page);
  await waitForNextPaint(page);
  await page.waitForTimeout(600);
  const dark = await readSelectedTokenStyles();

  expect(dark).not.toBeNull();
  expectContrast(dark?.buttonColor ?? '', dark?.buttonBackgroundColor ?? '');
  expectRgbInPalette(dark?.buttonBackgroundColor ?? '', neutralSurfacePalette, 2);
  expect(dark?.buttonBorderRadius).toBe('16px');
  expectRgbNear(dark?.textColor ?? '', [240, 215, 220], 2);
});

test('keeps swap connect-account action button expandable on narrow viewports', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openSwap(page);

  const button = page.locator('.swap-form .action-button').first();
  await expect(button).toBeVisible({ timeout: 15_000 });

  const metrics = await page.evaluate(() => {
    const actionButton = document.querySelector('.swap-form .action-button') as HTMLElement | null;
    const textNode = actionButton?.querySelector('.s-button__text') as HTMLElement | null;
    if (!actionButton || !textNode) return null;

    textNode.textContent = 'Connect account connect account';

    const buttonRect = actionButton.getBoundingClientRect();
    const textRect = textNode.getBoundingClientRect();
    const buttonStyles = getComputedStyle(actionButton);
    const textStyles = getComputedStyle(textNode);

    return {
      buttonHeight: Math.round(buttonRect.height),
      textHeight: Math.round(textRect.height),
      overflowBottom: Math.round(textRect.bottom - buttonRect.bottom),
      overflowTop: Math.round(buttonRect.top - textRect.top),
      buttonWhiteSpace: buttonStyles.whiteSpace,
      textWhiteSpace: textStyles.whiteSpace,
      textOverflow: textStyles.textOverflow,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.buttonWhiteSpace).toBe('normal');
  expect(metrics?.textWhiteSpace).toBe('normal');
  expect(metrics?.textOverflow).toBe('clip');
  expect(metrics?.buttonHeight ?? 0).toBeGreaterThan(42);
  expect(metrics?.textHeight ?? 0).toBeGreaterThan(24);
  expect((metrics?.overflowBottom ?? Number.POSITIVE_INFINITY) <= 1).toBe(true);
  expect((metrics?.overflowTop ?? Number.POSITIVE_INFINITY) <= 1).toBe(true);
});
