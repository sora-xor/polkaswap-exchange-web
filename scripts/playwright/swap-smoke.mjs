import { chromium } from 'playwright';

const BASE_URL = process.env.SWAP_SMOKE_BASE_URL || 'http://127.0.0.1:8896';
const SWAP_URL = `${BASE_URL}#/swap`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readButtonText = async (button) => ((await button.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem('dexSettings.disclaimerApprove', 'true');
  });
  const page = await context.newPage();
  const issues = [];
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(String(error));
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (/frame-ancestors.*meta/i.test(text)) return;
      errors.push(text);
    }
  });

  await page.goto(SWAP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(5_000);

  const tokenButtons = page.locator('.token-select-button');
  const tokenButtonCount = await tokenButtons.count().catch(() => 0);

  if (tokenButtonCount < 2) {
    issues.push(`Expected at least 2 token buttons, got ${tokenButtonCount}`);
  }

  const selectTokenByRow = async (buttonIndex, rowIndex) => {
    const button = tokenButtons.nth(buttonIndex);
    await button.click().catch(() => {});
    await sleep(600);

    const rows = page.locator('.asset-select .s-flex.asset');
    const rowCount = await rows.count().catch(() => 0);
    if (rowCount <= rowIndex) {
      return { ok: false, reason: `row ${rowIndex} missing`, rowCount };
    }

    const rowText = ((await rows.nth(rowIndex).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await rows.nth(rowIndex).click().catch(() => {});
    await sleep(700);

    return {
      ok: true,
      selectedRowText: rowText,
      buttonText: await readButtonText(button),
    };
  };

  const fromStart = await readButtonText(tokenButtons.nth(0));
  const toStart = await readButtonText(tokenButtons.nth(1));

  const fromChange1 = await selectTokenByRow(0, 1);
  const fromChange2 = await selectTokenByRow(0, 2);
  const toChange1 = await selectTokenByRow(1, 3);
  const toChange2 = await selectTokenByRow(1, 2);

  if (!fromChange1.ok || !fromChange2.ok || !toChange1.ok || !toChange2.ok) {
    issues.push(`Token selection failed: ${JSON.stringify({ fromChange1, fromChange2, toChange1, toChange2 })}`);
  }

  if (fromChange2.ok && /^(XOR|CHOOSE TOKEN)$/i.test(fromChange2.buttonText)) {
    issues.push(`From token did not persist a changed value: ${fromChange2.buttonText}`);
  }

  if (toChange2.ok && /^(XOR|CHOOSE TOKEN)$/i.test(toChange2.buttonText)) {
    issues.push(`To token did not persist a changed value: ${toChange2.buttonText}`);
  }

  // Outside-click close behavior.
  await tokenButtons.nth(1).click().catch(() => {});
  await sleep(500);
  const dialog = page.locator('.asset-select').first();
  if (!(await dialog.isVisible().catch(() => false))) {
    issues.push('Token dialog did not open for outside-click close check');
  } else {
    await page.mouse.click(5, 5);
    await sleep(500);
    if (await dialog.isVisible().catch(() => false)) {
      issues.push('Token dialog did not close on outside click');
    }
  }

  // Customize-widget switches should be clickable by both switch and label.
  const customizeSettingsButton = page.locator('.customise-widget button').first();
  if (!(await customizeSettingsButton.isVisible().catch(() => false))) {
    issues.push('Customize-widget settings button is not visible');
  } else {
    await customizeSettingsButton.click().catch(() => {});
    await sleep(500);

    const customizePopover = page.locator('.customise-widget-popper:visible').first();
    if (!(await customizePopover.isVisible().catch(() => false))) {
      issues.push('Customize-widget popover did not open');
    } else {
      const firstOption = customizePopover.locator('.customise-option').first();
      const switcher = firstOption.locator('.el-switch').first();
      const label = firstOption.locator('.customise-option__label').first();

      const before = await switcher.getAttribute('aria-checked').catch(() => null);
      await switcher.click().catch(() => {});
      await sleep(200);
      const afterSwitch = await switcher.getAttribute('aria-checked').catch(() => null);
      await label.click().catch(() => {});
      await sleep(200);
      const afterLabel = await switcher.getAttribute('aria-checked').catch(() => null);

      if (before === afterSwitch) {
        issues.push('Customize switch did not toggle when clicking the switch control');
      }

      if (afterSwitch === afterLabel) {
        issues.push('Customize switch did not toggle when clicking the option label');
      }
    }
  }

  await page.screenshot({ path: 'output/playwright/swap-smoke.png', fullPage: true });
  await context.close();
  await browser.close();

  const report = {
    url: SWAP_URL,
    timestamp: new Date().toISOString(),
    fromStart,
    toStart,
    fromChange1,
    fromChange2,
    toChange1,
    toChange2,
    issues,
    errors,
    pass: issues.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));

  if (issues.length > 0) {
    process.exitCode = 1;
  }
};

await run();
