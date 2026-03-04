import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('https://polkaswap.io/#/swap', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2500);

const html = await page.evaluate(() => {
  const el = document.querySelector('.app-header-menu');
  return el?.outerHTML || null;
});

const trigger = await page.evaluate(() => {
  const candidates = Array.from(document.querySelectorAll('.app-header-menu [class*="s-icon-"]')).map((el) => ({
    tag: el.tagName,
    className: el.className,
    outer: el.outerHTML,
  }));
  return candidates;
});

console.log(JSON.stringify({ html, triggerCount: trigger.length, trigger: trigger.slice(0, 6) }, null, 2));
await browser.close();
