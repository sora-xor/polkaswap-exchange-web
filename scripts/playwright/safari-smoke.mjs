import { webkit } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ensurePreviewServer } from './preview-server-helper.mjs';
import { resolveAppBaseUrl, resolveRouteUrl } from './url-helpers.mjs';

const RAW_BASE_URL = process.env.SAFARI_SMOKE_BASE_URL || 'http://127.0.0.1:8896';
const BASE_URL = resolveAppBaseUrl(RAW_BASE_URL, process.env.SAFARI_SMOKE_PREFIX);
const ROUTES = (process.env.SAFARI_SMOKE_ROUTES || '#/swap,#/trade/DAI/KUSD,#/wallet,#/burn,#/stats')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const outDir = path.join(process.cwd(), 'output/playwright/safari-smoke');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeRouteName = (route) => route.replace(/^#\//, '').replace(/\//g, '-');

const waitForCountAtLeast = async (locator, minimum, timeout = 10_000, step = 200) => {
  const deadline = Date.now() + timeout;
  let count = 0;

  while (Date.now() < deadline) {
    count = await locator.count().catch(() => 0);
    if (count >= minimum) return count;
    await sleep(step);
  }

  return locator.count().catch(() => 0);
};

const run = async () => {
  await fs.mkdir(outDir, { recursive: true });
  const stopPreviewServer = await ensurePreviewServer(RAW_BASE_URL, BASE_URL);

  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    await context.addInitScript(() => {
      localStorage.setItem('dexSettings.disclaimerApprove', 'true');
    });
    const page = await context.newPage();

    const report = [];

    for (const route of ROUTES) {
      const issues = [];
      const errors = [];
      const url = resolveRouteUrl(RAW_BASE_URL, route, process.env.SAFARI_SMOKE_PREFIX);

      const consoleListener = (message) => {
        if (message.type() === 'error') {
          const text = message.text();
          if (/frame-ancestors.*meta/i.test(text)) return;
          errors.push(text);
        }
      };

      const pageErrorListener = (error) => {
        errors.push(String(error));
      };

      page.on('console', consoleListener);
      page.on('pageerror', pageErrorListener);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await sleep(5_000);

      if (route === '#/swap') {
        const tokenButtons = page.locator('.token-select-button');
        const count = await waitForCountAtLeast(tokenButtons, 2);
        if (count < 2) {
          issues.push(`swap token button count is ${count}`);
        } else {
          const fromButton = tokenButtons.nth(0);
          const dialog = page.locator('.asset-select').first();

          try {
            await fromButton.click({ timeout: 5_000 });
            await dialog.waitFor({ state: 'visible', timeout: 5_000 });
          } catch (error) {
            issues.push(`swap token dialog did not open in safari check (${String(error)})`);
          }

          if (!issues.length) {
            const rows = dialog.locator('.s-flex.asset');
            const rowCount = await waitForCountAtLeast(rows, 2);
            if (rowCount <= 1) {
              issues.push(`swap token rows unavailable (${rowCount})`);
            } else {
              try {
                await rows.nth(1).click({ timeout: 5_000 });
                await sleep(700);
              } catch (error) {
                issues.push(`swap token selection failed in safari check (${String(error)})`);
              }
            }

            if (!issues.length) {
              const fromText = ((await fromButton.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
              if (!fromText || /^(XOR|CHOOSE TOKEN)$/i.test(fromText)) {
                issues.push(`swap from token did not update in safari check (${fromText})`);
              }
            }
          }
        }

        const customizeSettingsButton = page.locator('.customise-widget button').first();
        if (!(await customizeSettingsButton.isVisible().catch(() => false))) {
          issues.push('swap customize-widget settings button not visible in safari check');
        }
      }

      if (route === '#/wallet') {
        const connectVisible = await page
          .getByRole('button', { name: /connect account|connect wallet/i })
          .first()
          .isVisible()
          .catch(() => false);
        if (!connectVisible) {
          issues.push('wallet unauthenticated connect button not visible in safari check');
        }
      }

      await page.screenshot({ path: path.join(outDir, `${sanitizeRouteName(route)}.png`), fullPage: true });

      report.push({
        route,
        url,
        issues,
        errors,
        pass: issues.length === 0,
      });

      page.off('console', consoleListener);
      page.off('pageerror', pageErrorListener);
    }

    const summary = {
      baseUrl: BASE_URL,
      routes: ROUTES,
      timestamp: new Date().toISOString(),
      passCount: report.filter((item) => item.pass).length,
      failCount: report.filter((item) => !item.pass).length,
      results: report,
    };

    console.log(JSON.stringify({ summary }, null, 2));

    if (summary.failCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await stopPreviewServer();
  }
};

await run();
