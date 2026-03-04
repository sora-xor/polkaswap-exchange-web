import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://127.0.0.1:4173/#/swap', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2000);

const html = await page.evaluate(() => {
  const el = document.querySelector('.app-header-menu, .header-menu__button, .settings-control');
  return el?.outerHTML || null;
});

const all = await page.evaluate(() => {
  return Array.from(
    document.querySelectorAll('[class*="s-icon-grid-block-align-left-24"], .s-icon-grid-block-align-left-24')
  ).map((el) => ({
    tag: el.tagName,
    className: el.className,
    outer: el.outerHTML,
  }));
});

console.log(JSON.stringify({ html, allCount: all.length, all }, null, 2));
await browser.close();
