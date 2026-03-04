import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://127.0.0.1:4173/#/swap', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(3500);
const data = await page.evaluate(() => {
  const menu = document.querySelector('.app-header-menu');
  return {
    exists: !!menu,
    html: menu?.innerHTML?.slice(0, 4000) || null,
    icons: Array.from(menu?.querySelectorAll('[class*="s-icon-"]') || []).map((el) =>
      Array.from(el.classList).filter((c) => c.startsWith('s-icon-'))
    ),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
