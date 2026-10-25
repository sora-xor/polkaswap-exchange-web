import { expect, test } from '@playwright/test';

import { ensureAppLoaded, ipfsEntryUrl, preparePage, trackConsole } from './support/ipfs';

test.beforeEach(async ({ page }) => {
  await preparePage(page, { stubRuntimeEnv: true });
});

test.describe('search field focus', () => {
  test('shows one rounded ring around the whole field, not a square one around the bare input', async ({ page }) => {
    const consoleErrors = trackConsole(page);

    await page.goto(`${ipfsEntryUrl}#/explore/tokens`);
    await ensureAppLoaded(page);

    const input = page.locator('.search-input input').first();

    await input.waitFor();
    // A key press first, so focus counts as keyboard focus like it does for a real user.
    await page.keyboard.press('Tab');
    await input.focus();

    const rings = await input.evaluate((element) => {
      const field = element.closest<HTMLElement>('.search-input');
      const fieldStyle = field ? getComputedStyle(field) : null;

      return {
        inputOutline: getComputedStyle(element).outlineStyle,
        fieldOutline: fieldStyle?.outlineStyle,
        fieldOutlineWidth: fieldStyle?.outlineWidth,
        fieldOutlineOffset: fieldStyle?.outlineOffset,
        fieldRadius: fieldStyle?.borderTopLeftRadius,
      };
    });

    // The app-wide ring would be a square outline around the bare input, doubling the field's own outline.
    expect(rings.inputOutline).toBe('none');
    expect(rings.fieldOutline).toBe('solid');
    expect(rings.fieldOutlineWidth).toBe('2px');
    // Inside the field's edge, so a scrolling parent cannot clip it, and it follows the rounded corners.
    expect(rings.fieldOutlineOffset).toBe('-2px');
    expect(parseFloat(rings.fieldRadius ?? '0')).toBeGreaterThan(8);
    expect(consoleErrors).toEqual([]);
  });
});
