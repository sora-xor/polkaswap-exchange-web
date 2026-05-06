import { expect, type Locator, type Page } from '@playwright/test';

import type { RouteAuditCase } from './route-matrix';

const corruptionPatterns = [
  /\[object Promise\]/i,
  /\bNaN\b/,
  /draggable element must have an item slot/i,
  /Cannot read properties of undefined \(reading '\$refs'\)/i,
  /Cannot read properties of null \(reading 'query'\)/i,
];

export const VISUAL_TEST_MASK_SELECTORS = [
  '.app-status',
  '.el-notification',
  '.chart-container',
  '.echarts',
  '.skeleton',
  '.app-menu',
] as const;

export const createVisualMaskLocators = (page: Page): Locator[] => {
  return VISUAL_TEST_MASK_SELECTORS.map((selector) => page.locator(selector));
};

export const waitForAcceptedHash = async (page: Page, acceptedHashes: string[]): Promise<void> => {
  await page.waitForFunction(
    (allowedHashes) => {
      const normalize = (hash: string): string => hash.split('?')[0].replace(/\/+$/, '');
      const current = window.location.hash;
      const currentPath = normalize(current);

      return allowedHashes.some((expected) => {
        const expectedPath = normalize(expected);
        return currentPath === expectedPath || currentPath.startsWith(`${expectedPath}/`);
      });
    },
    acceptedHashes,
    { timeout: 15_000 }
  );
};

export const expectNoCorruptedUiText = async (page: Page): Promise<void> => {
  const bodyText = await page.locator('body').innerText();

  for (const pattern of corruptionPatterns) {
    expect(bodyText).not.toMatch(pattern);
  }
};

export const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const metrics = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    return { viewportWidth, docScrollWidth, bodyScrollWidth };
  });

  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
};

export const expectAppMainClassToken = async (
  page: Page,
  expectedClassToken: string,
  additionalExpectedClassTokens: string[] = []
): Promise<void> => {
  const appMainClasses = await page.evaluate(() => document.querySelector('.app-main')?.className ?? '');
  const classTokens = appMainClasses.split(/\s+/);
  const expectedTokens = [expectedClassToken, ...additionalExpectedClassTokens];

  expect(
    expectedTokens.some((token) => classTokens.includes(token)),
    `Expected one of [${expectedTokens.join(', ')}], got "${appMainClasses}"`
  ).toBe(true);
};

export const assertRouteRendering = async (page: Page, route: RouteAuditCase): Promise<void> => {
  await waitForAcceptedHash(page, route.acceptedHashes);
  await expect(page.locator('.app-main')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(200);
  await expectAppMainClassToken(page, route.expectedClassToken, route.additionalExpectedClassTokens);
  if (!route.skipCorruptionCheck) {
    await expectNoCorruptedUiText(page);
  }
  await expectNoHorizontalOverflow(page);
};
