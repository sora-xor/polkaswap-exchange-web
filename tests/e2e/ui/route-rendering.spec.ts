import { expect, test, type Page } from '@playwright/test';

import {
  ensureAppLoaded,
  filterKnownWalletConsoleNoise,
  ipfsEntryUrl,
  preparePage,
  trackConsole,
} from './support/ipfs';
import { assertRouteRendering, createVisualMaskLocators } from './support/render-assertions';
import {
  AUTHENTICATED_WALLET_STATE,
  protectedAuthRouteAuditCases,
  protectedRedirectRouteAuditCases,
  publicRouteAuditCases,
  snapshotRouteAuditCases,
} from './support/route-matrix';

import type { RouteAuditCase } from './support/route-matrix';

const viewports = [
  { id: 'desktop', width: 1366, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
] as const;

const snapshotRouteCaseIds = new Set(snapshotRouteAuditCases.map((route) => route.id));

const applyAuthState = async (page: Page, authenticated: boolean): Promise<void> => {
  await page.addInitScript(
    ({ shouldAuthenticate, state }) => {
      const keys = ['sora.address', 'sora.name', 'sora.source', 'sora.isExternal'];
      for (const key of keys) {
        localStorage.removeItem(key);
      }

      if (!shouldAuthenticate) return;

      localStorage.setItem('sora.address', state.address);
      localStorage.setItem('sora.name', state.name);
      localStorage.setItem('sora.source', state.source);
      localStorage.setItem('sora.isExternal', state.isExternal);
    },
    { shouldAuthenticate: authenticated, state: AUTHENTICATED_WALLET_STATE }
  );
};

const toScreenshotName = (viewportId: string, route: RouteAuditCase): string => {
  return `route-${viewportId}-${route.id}.png`;
};

test.beforeEach(async ({ page }) => {
  await preparePage(page, { stubRuntimeEnv: true });
});

test.describe('route rendering matrix', () => {
  for (const viewport of viewports) {
    test.describe(viewport.id, () => {
      for (const route of [...publicRouteAuditCases, ...protectedAuthRouteAuditCases]) {
        test(`renders ${route.id}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await applyAuthState(page, route.mode === 'protected-auth');

          const consoleErrors = trackConsole(page, {
            extraAllowedPatterns: route.extraAllowedConsolePatterns,
          });

          await page.goto(`${ipfsEntryUrl}${route.hash}`);
          await ensureAppLoaded(page);
          await assertRouteRendering(page, route);

          if (snapshotRouteCaseIds.has(route.id)) {
            await expect(page.locator('.app-main')).toHaveScreenshot(toScreenshotName(viewport.id, route), {
              animations: 'disabled',
              caret: 'hide',
              mask: createVisualMaskLocators(page),
              maxDiffPixelRatio: 0.02,
            });
          }

          const normalizedErrors =
            route.mode === 'protected-auth' ? filterKnownWalletConsoleNoise(consoleErrors) : consoleErrors;

          expect(normalizedErrors).toEqual([]);
        });
      }

      for (const route of protectedRedirectRouteAuditCases) {
        test(`redirects unauthenticated ${route.id}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await applyAuthState(page, false);

          const consoleErrors = trackConsole(page, {
            extraAllowedPatterns: route.extraAllowedConsolePatterns,
          });

          await page.goto(`${ipfsEntryUrl}${route.hash}`);
          await ensureAppLoaded(page);
          await assertRouteRendering(page, route);

          expect(consoleErrors).toEqual([]);
        });
      }
    });
  }
});
