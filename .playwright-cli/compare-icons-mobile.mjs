import { chromium } from 'playwright';

async function collect(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);

  const settingsTrigger = page.locator(
    '.app-header-menu i.s-icon-grid-block-align-left-24, i.s-icon-grid-block-align-left-24'
  );
  if (await settingsTrigger.count()) {
    await settingsTrigger.first().click({ force: true });
    await page.waitForTimeout(500);
  }

  const data = await page.evaluate(() => {
    const iconClass = (el) => {
      if (!el) return null;
      const classes = Array.from(el.classList || []);
      return classes.find((c) => c.startsWith('s-icon-')) ?? null;
    };

    const getControlIcon = (selector) => {
      const control = document.querySelector(selector);
      if (!control) return null;
      return iconClass(control.querySelector('i[class*="s-icon-"]'));
    };

    // Keep this set strict and stable: only controls that should mirror production menu/header icons.
    const topHeaderControls = {
      menu: getControlIcon('.app-menu-button'),
      account: getControlIcon('.account-control'),
      settings: getControlIcon('.app-header-menu .settings-control, .app-header-menu .header-menu__button'),
    };

    const settingsRows = Array.from(document.querySelectorAll('.header-menu .header-menu__item')).map((item) => {
      const text = (item.querySelector('p')?.textContent || item.textContent || '').replace(/\s+/g, ' ').trim();
      const iconEl = item.querySelector(':scope > i[class*="s-icon-"]') || item.querySelector('i[class*="s-icon-"]');
      const indicatorEl =
        item.querySelector('.icontype[class*="s-icon-"]') || item.querySelector('.icontype i[class*="s-icon-"]');
      return { text, icon: iconClass(iconEl), indicator: iconClass(indicatorEl) };
    });

    return {
      topHeaderControls,
      settingsRows,
    };
  });

  await browser.close();
  return data;
}

const [live, local] = await Promise.all([
  collect('https://polkaswap.io/#/swap'),
  collect('http://127.0.0.1:4173/#/swap'),
]);

console.log(JSON.stringify({ live, local }, null, 2));
