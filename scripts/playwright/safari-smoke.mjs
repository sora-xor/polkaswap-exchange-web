import { webkit } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE_URL = process.env.SAFARI_SMOKE_BASE_URL || 'http://127.0.0.1:8896';
const ROUTES = (process.env.SAFARI_SMOKE_ROUTES || '#/swap,#/trade/DAI/KUSD,#/wallet,#/burn,#/stats')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const outDir = path.join(process.cwd(), 'output/playwright/safari-smoke');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeRouteName = (route) => route.replace(/^#\//, '').replace(/[\/]/g, '-');

const run = async () => {
  await fs.mkdir(outDir, { recursive: true });

  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const report = [];

  for (const route of ROUTES) {
    const issues = [];
    const errors = [];
    const url = `${BASE_URL}${route}`;

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
      const count = await tokenButtons.count().catch(() => 0);
      if (count < 2) {
        issues.push(`swap token button count is ${count}`);
      } else {
        const fromButton = tokenButtons.nth(0);
        await fromButton.click().catch(() => {});
        await sleep(500);
        const rows = page.locator('.asset-select .s-flex.asset');
        const rowCount = await rows.count().catch(() => 0);
        if (rowCount <= 1) {
          issues.push(`swap token rows unavailable (${rowCount})`);
        } else {
          await rows.nth(1).click().catch(() => {});
          await sleep(700);
          const fromText = ((await fromButton.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
          if (!fromText || /^(XOR|CHOOSE TOKEN)$/i.test(fromText)) {
            issues.push(`swap from token did not update in safari check (${fromText})`);
          }
        }
      }

      const customizeSettingsButton = page.locator('.customise-widget button').first();
      if (!(await customizeSettingsButton.isVisible().catch(() => false))) {
        issues.push('swap customize-widget settings button not visible in safari check');
      }
    }

    if (route === '#/wallet') {
      const connectVisible = await page.getByRole('button', { name: /connect account|connect wallet/i }).first().isVisible().catch(() => false);
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

  await browser.close();

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
};

await run();
