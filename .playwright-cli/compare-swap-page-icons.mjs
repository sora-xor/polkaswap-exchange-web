import { chromium } from 'playwright';

async function collect(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);

  const icons = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('[class*="s-icon-"]'));
    const names = all.flatMap((el) => Array.from(el.classList)).filter((c) => c.startsWith('s-icon-'));
    return Array.from(new Set(names)).sort();
  });

  await browser.close();
  return icons;
}

const [live, local] = await Promise.all([
  collect('https://polkaswap.io/#/swap'),
  collect('http://127.0.0.1:4173/#/swap'),
]);

const onlyLive = live.filter((icon) => !local.includes(icon));
const onlyLocal = local.filter((icon) => !live.includes(icon));

console.log(JSON.stringify({ onlyLive, onlyLocal, liveCount: live.length, localCount: local.length }, null, 2));
