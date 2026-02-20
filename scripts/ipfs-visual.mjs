/* eslint-disable no-console */
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright';

const distDir = join(process.cwd(), 'dist');
const port = 41732;
const cid = process.env.IPFS_SMOKE_CID || 'ipfs-visual';
const basePath = `/ipfs/${cid}`;

const outputDir = join(process.cwd(), 'output', 'playwright', 'ipfs-visual');

const contentTypeByExt = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const resolvePath = (urlPath) => {
  const normalized = urlPath.startsWith(basePath) ? urlPath.slice(basePath.length) || '/' : urlPath;
  const pathInDist = normalized === '/' ? '/index.html' : normalized;
  const trimmed = pathInDist.replace(/^\/+/, '');
  return join(distDir, trimmed);
};

const serveDist = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  const filePath = resolvePath(new URL(req.url, `http://localhost:${port}`).pathname);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = contentTypeByExt[ext];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const file = await fs.readFile(filePath);
    res.statusCode = 200;
    res.end(file);
  } catch (error) {
    res.statusCode = 404;
    res.end('Not found');
    console.error('[ipfs-visual] 404', filePath, error.message);
  }
});

const routes = [
  { name: 'swap', hash: '/swap' },
  { name: 'trade', hash: '/trade' },
  { name: 'points', hash: '/points' },
  { name: 'pool', hash: '/pool' },
  { name: 'staking', hash: '/staking' },
  { name: 'bridge', hash: '/bridge' },
  { name: 'wallet', hash: '/wallet' },
  { name: 'kensetsu', hash: '/kensetsu' },
  { name: 'explore', hash: '/explore' },
  { name: 'stats', hash: '/stats' },
];

const run = async () => {
  await fs.mkdir(outputDir, { recursive: true });

  console.log(`[ipfs-visual] Serving ${distDir} at http://127.0.0.1:${port}${basePath}/index.html#/`);
  await new Promise((resolve) => serveDist.listen(port, '127.0.0.1', resolve));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Force a non-headless user agent so the app does not enter offline shell mode
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    window.__PS_FORCE_ONLINE__ = true;
    window.__PS_IPFS_CHECK__ = false;
    try {
      const ua = (navigator.userAgent || '').replace(/HeadlessChrome/gi, 'Chrome');
      Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true });
      Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
    } catch {
      // ignore
    }
    window.Telegram = window.Telegram || { WebApp: { ready: () => {}, expand: () => {} } };
  });

  const page = await context.newPage();
  const consoleMessages = [];
  let pageError;

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    pageError = err;
  });

  try {
    for (const route of routes) {
      consoleMessages.length = 0;
      pageError = undefined;

      const url = `http://127.0.0.1:${port}${basePath}/index.html#${route.hash}`;
      console.log('[ipfs-visual] goto', url);

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(6000);

      if (pageError) throw pageError;

      const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
      if (consoleErrors.length > 0) {
        throw new Error(`[ipfs-visual] Console errors on ${route.name}: ${consoleErrors.map((e) => e.text).join(' | ')}`);
      }

      const screenshotPath = join(outputDir, `${route.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log('[ipfs-visual] screenshot', screenshotPath);
    }

    console.log('[ipfs-visual] PASS');
  } finally {
    await serveDist.close();
    await context.close();
    await browser.close();
  }
};

run().catch((error) => {
  console.error('[ipfs-visual] FAIL', error);
  process.exitCode = 1;
});
