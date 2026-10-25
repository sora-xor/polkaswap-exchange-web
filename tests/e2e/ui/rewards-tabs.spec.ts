import { expect, test } from '@playwright/test';

import { ensureAppLoaded, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

test.beforeEach(async ({ page }) => {
  await preparePage(page, { stubRuntimeEnv: true });
});

test.describe('rewards tab pill', () => {
  test('is drawn as one clean capsule with an inset highlight', async ({ page }) => {
    const consoleErrors = trackConsole(page);

    await page.goto(`${ipfsEntryUrl}#/rewards`);
    await ensureAppLoaded(page);
    await page.locator('.rewards-tabs__tabs .el-tabs__item').first().waitFor();

    const pill = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('.rewards-tabs__tabs');
      const track = root?.querySelector<HTMLElement>('.el-tabs__nav-wrap');
      const items = Array.from(root?.querySelectorAll<HTMLElement>('.el-tabs__item') ?? []);
      const active = root?.querySelector<HTMLElement>('.el-tabs__item.is-active');
      const radii = track ? getComputedStyle(track) : null;

      return {
        trackRadii: radii
          ? [
              radii.borderTopLeftRadius,
              radii.borderTopRightRadius,
              radii.borderBottomRightRadius,
              radii.borderBottomLeftRadius,
            ]
          : [],
        itemShadows: items.map((item) => getComputedStyle(item).boxShadow),
        itemHeights: items.map((item) => Math.round(item.getBoundingClientRect().height)),
        activeHighlight: active ? getComputedStyle(active, '::before').backgroundColor : '',
        inactiveHighlight: items
          .filter((item) => item !== active)
          .map((item) => getComputedStyle(item, '::before').backgroundColor),
      };
    });

    // All four corners of the track match, so it follows the outline of the pill instead of showing slivers.
    expect(pill.trackRadii).toHaveLength(4);
    expect(new Set(pill.trackRadii).size).toBe(1);
    // The design system's soft shadow around every tab spilled over the neighbours as dark patches.
    expect(pill.itemShadows).toEqual(['none', 'none', 'none']);
    // 52px pill minus its 1px border: taller items would be cropped at the rounded ends.
    expect(pill.itemHeights).toEqual([50, 50, 50]);
    // Only the current tab is highlighted at rest.
    expect(pill.activeHighlight).not.toBe('rgba(0, 0, 0, 0)');
    expect(pill.inactiveHighlight).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
    expect(consoleErrors).toEqual([]);
  });

  test('shows keyboard focus as one ring around the highlight, not a clipped arc', async ({ page }) => {
    await page.goto(`${ipfsEntryUrl}#/rewards`);
    await ensureAppLoaded(page);

    const first = page.locator('.rewards-tabs__tabs .el-tabs__item').first();

    await first.waitFor();
    await first.focus();

    const rings = await first.evaluate((item) => ({
      item: getComputedStyle(item).outlineStyle,
      highlight: getComputedStyle(item, '::before').outlineStyle,
      highlightWidth: getComputedStyle(item, '::before').outlineWidth,
    }));

    // The app-wide ring would sit outside the tab, where the pill cuts it off at the rounded end.
    expect(rings.item).toBe('none');
    expect(rings.highlight).toBe('solid');
    expect(rings.highlightWidth).toBe('2px');
  });
});
