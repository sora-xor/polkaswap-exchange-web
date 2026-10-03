import { expect, test } from '@playwright/test';

import { ensureAppLoaded, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

for (const theme of ['light', 'dark'] as const) {
  test(`Discovery ${theme}: native theme, provider choices and safe offline state`, async ({
    browser,
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparePage(page, { stubRuntimeEnv: true });
    await page.addInitScript((selectedTheme) => localStorage.setItem('dexSettings.theme', selectedTheme), theme);
    const errors = trackConsole(page);
    await page.goto(`${ipfsEntryUrl}#/bots/discover`);
    await ensureAppLoaded(page);

    await expect(page.getByTestId('bot-discovery')).toBeVisible();
    await expect(page.getByTestId('discovery-tab')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('html')).toHaveAttribute('design-system-theme', theme);
    await expect(page.getByTestId('discovery-start')).toBeDisabled();
    // The first step is the visible action: connect an AI before research can start.
    await expect(page.getByTestId('discovery-connect')).toBeInViewport();
    await expect(page.getByTestId('discovery-provider-claude')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('discovery-progress')).toHaveCount(0);
    await expect(page.getByTestId('discovery-visuals')).toBeVisible();
    await expect(page.getByTestId('discovery-visuals-empty')).toBeVisible();
    await expect(page.getByTestId('discovery-training-point')).toHaveCount(0);
    await expect(page.getByTestId('discovery-holdout-point')).toHaveCount(0);
    const primaryColors = await page.getByTestId('discovery-start').evaluate((button) => {
      const disabledFill = getComputedStyle(button).backgroundColor;
      const enabledButton = button.cloneNode(true) as HTMLButtonElement;
      enabledButton.removeAttribute('disabled');
      button.after(enabledButton);
      const enabledFill = getComputedStyle(enabledButton).backgroundColor;
      const enabledText = getComputedStyle(enabledButton).color;
      const probe = document.createElement('span');
      probe.style.color = 'var(--s-color-on-action)';
      enabledButton.append(probe);
      const tokenText = getComputedStyle(probe).color;
      enabledButton.remove();
      return { disabledFill, enabledFill, enabledText, tokenText };
    });
    expect(primaryColors.disabledFill).not.toBe(primaryColors.enabledFill);
    expect(primaryColors.enabledText).toBe(primaryColors.tokenText);
    const desktopColumns = await page.locator('.discovery-layout').evaluate((layout) => {
      const controls = layout.querySelector('.discovery-controls')!.getBoundingClientRect();
      const workspace = layout.querySelector('.discovery-workspace')!.getBoundingClientRect();
      return {
        columns: getComputedStyle(layout).gridTemplateColumns,
        sideBySide: controls.right < workspace.left,
      };
    });
    expect(desktopColumns.columns).not.toBe('none');
    expect(desktopColumns.sideBySide).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${theme}-desktop.png`), fullPage: true });
    await page.getByTestId('discovery-provider-other').click();
    await page.getByTestId('discovery-provider').selectOption('claude-code');
    await expect(page.getByTestId('discovery-pair-code')).toBeVisible();
    await expect(page.getByTestId('discovery-api-key')).toHaveCount(0);
    await page.getByTestId('discovery-provider').selectOption('custom');
    await expect(page.getByTestId('discovery-endpoint')).toBeVisible();
    await expect(page.getByTestId('discovery-api-key')).toBeVisible();
    const colors = await page.getByTestId('bot-discovery').evaluate((root) => {
      const surface = root.querySelector('.discovery-controls')!;
      const input = root.querySelector('.discovery-field input')!;
      return {
        surface: getComputedStyle(surface).backgroundColor,
        input: getComputedStyle(input).backgroundColor,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(colors.surface).not.toBe(colors.input);
    expect(colors.overflow).toBe(false);

    // A fresh portrait context keeps screen.orientation consistent with the viewport.
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      screen: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    try {
      const mobilePage = await mobileContext.newPage();
      await preparePage(mobilePage, { stubRuntimeEnv: true });
      await mobilePage.addInitScript(
        (selectedTheme) => localStorage.setItem('dexSettings.theme', selectedTheme),
        theme
      );
      const mobileErrors = trackConsole(mobilePage);
      await mobilePage.goto(`${ipfsEntryUrl}#/bots/discover`);
      await ensureAppLoaded(mobilePage);
      await expect(mobilePage.getByTestId('bot-discovery')).toBeVisible();
      await expect(mobilePage.getByText('Please, rotate your device')).toHaveCount(0);
      await expect
        .poll(() => mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        .toBe(true);
      await expect
        .poll(() =>
          mobilePage.locator('.discovery-layout').evaluate((layout) => {
            const controls = layout.querySelector('.discovery-controls')!.getBoundingClientRect();
            const workspace = layout.querySelector('.discovery-workspace')!.getBoundingClientRect();
            return controls.bottom < workspace.top;
          })
        )
        .toBe(true);
      await expect(mobilePage.getByTestId('discovery-provider-claude')).toBeVisible();
      await expect(mobilePage.getByTestId('discovery-progress')).toHaveCount(0);
      await expect(mobilePage.getByTestId('discovery-connect-card')).toBeInViewport();
      await mobilePage.screenshot({ path: testInfo.outputPath(`${theme}-mobile.png`), fullPage: true });
      await mobilePage.screenshot({ path: testInfo.outputPath(`${theme}-mobile-controls.png`) });
      await mobilePage.getByTestId('discovery-visuals').scrollIntoViewIfNeeded();
      await mobilePage.screenshot({ path: testInfo.outputPath(`${theme}-mobile-visuals.png`) });
      expect(mobileErrors).toEqual([]);
    } finally {
      await mobileContext.close();
    }
    expect(errors).toEqual([]);
  });
}
