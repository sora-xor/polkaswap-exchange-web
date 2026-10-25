import { expect, test } from '@playwright/test';

import { ensureAppLoaded, trackConsole } from './support/ipfs';

const externalUrl = process.env.PS_E2E_EXTERNAL_URL;

test.describe('external runtime smoke', () => {
  test.skip(!externalUrl, 'Enable with PS_E2E_EXTERNAL_URL');

  test('renders the supplied external URL without a blank app shell', async ({ page }) => {
    const consoleErrors = trackConsole(page, { mode: 'live' });
    const failedRequests: Array<{ url: string; errorText: string }> = [];

    await page.route('https://telegram.org/js/telegram-web-app.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.Telegram = window.Telegram || { WebApp: { ready() {}, expand() {}, close() {} } };`,
      });
    });

    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        errorText: request.failure()?.errorText ?? 'unknown',
      });
    });

    await page.goto(externalUrl as string, { waitUntil: 'commit' });
    await page.waitForTimeout(5_000);

    const runtimeSnapshot = await page.evaluate(() => ({
      href: window.location.href,
      hash: window.location.hash,
      readyState: document.readyState,
      title: document.title,
      appChildCount: document.querySelector('#app')?.childElementCount ?? 0,
      bodyLength: document.body?.innerText?.trim?.().length ?? 0,
      resourceUrls: performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => name.includes('/assets/') || name.endsWith('/env.json')),
    }));

    console.log(
      JSON.stringify(
        {
          runtimeSnapshot,
          consoleErrors,
          failedRequests,
        },
        null,
        2
      )
    );

    expect(runtimeSnapshot.readyState).toBe('complete');
    expect(runtimeSnapshot.appChildCount).toBeGreaterThan(0);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
