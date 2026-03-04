import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://127.0.0.1:4173/#/swap', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2500);

const trigger = page.locator('.app-header-menu i.s-icon-grid-block-align-left-24').first();
console.log('trigger count', await trigger.count());
if (await trigger.count()) {
  await trigger.click({ force: true });
  await page.waitForTimeout(800);
}

const visibleMenuCount = await page
  .locator(
    '.header-menu.el-dropdown-menu[style*="display: block"], .header-menu.el-dropdown-menu:not([style*="display: none"])'
  )
  .count();
const headerRows = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.header-menu .header-menu__item')).map((item) => {
    const text = (item.querySelector('p')?.textContent || item.textContent || '').replace(/\s+/g, ' ').trim();
    const iconEl = item.querySelector(':scope > i[class*="s-icon-"]') || item.querySelector('i[class*="s-icon-"]');
    const indicatorEl =
      item.querySelector('.icontype[class*="s-icon-"]') || item.querySelector('.icontype i[class*="s-icon-"]');
    const icon = iconEl ? Array.from(iconEl.classList).find((c) => c.startsWith('s-icon-')) : null;
    const indicator = indicatorEl ? Array.from(indicatorEl.classList).find((c) => c.startsWith('s-icon-')) : null;
    return { text, icon, indicator };
  });
});

console.log(JSON.stringify({ visibleMenuCount, headerRows }, null, 2));
await browser.close();
