/* eslint-disable no-console */
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright';

const distDir = join(process.cwd(), 'dist');
const port = 41731;
const cid = process.env.IPFS_SMOKE_CID || 'ipfs-smoke';
const basePath = `/ipfs/${cid}`;

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
  const trimmed = pathInDist.replace(/^\//, '');
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
    console.error('[ipfs-smoke] 404', filePath, error.message);
  }
});

const consoleMessages = [];
let pageError;

const run = async () => {
  console.log(`[ipfs-smoke] Serving ${distDir} at http://127.0.0.1:${port}${basePath}/index.html#/`);
  await new Promise((resolve) => serveDist.listen(port, '127.0.0.1', resolve));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Force a non-headless user agent so the app does not enter offline shell mode
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  await context.addInitScript(() => {
    // Prevent offline shell detection from short-circuiting the app
    window.__PS_FORCE_ONLINE__ = true;
    window.__PS_IPFS_CHECK__ = false;
    try {
      const ua = (navigator.userAgent || '').replace(/HeadlessChrome/gi, 'Chrome');
      Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true });
      Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
    } catch (error) {
      console.warn('[ipfs-smoke:init] navigator override failed', error);
    }
    // Some gateways block Telegram bridge; guard against missing object access
    window.Telegram = window.Telegram || { WebApp: { ready: () => {}, expand: () => {} } };
  });

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    const level = msg.type();
    if (level === 'error' || level === 'warning') {
      console.log(`[console:${level}]`, msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageError = err;
    console.error('[pageerror]', err);
  });

  try {
    await page.goto(`http://127.0.0.1:${port}${basePath}/index.html#/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const appState = await page.evaluate(() => {
      const app = document.querySelector('#app');
      const offlineShell = app?.querySelector('.offline-shell') !== null;
      return {
        hasContent: Boolean(app && app.children.length > 0),
        offlineShell,
        title: document.title,
      };
    });
    let envDebug;
    let storeDebug;

    if (pageError) {
      throw pageError;
    }
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    if (consoleErrors.length > 0 || !appState.hasContent || appState.offlineShell) {
      envDebug = await page.evaluate(() => ({
        forceOnline: window.__PS_FORCE_ONLINE__,
        ipfsCheck: window.__PS_IPFS_CHECK__,
        search: window.location.search,
        href: window.location.href,
        onLine: navigator.onLine,
        webdriver: navigator.webdriver,
        userAgent: navigator.userAgent,
      }));
      storeDebug = await page.evaluate(() => {
        const store = window.__PS_APP_STORE__?.original ?? window.__PS_APP_STORE__;

        if (!store) {
          return { hasStore: false };
        }

        const state = store.state ?? store.getState?.();
        const walletCommit = store.commit?.wallet;

        return {
          hasStore: true,
          hasSettings: Boolean(state?.settings),
          hasWallet: Boolean(state?.wallet),
          hasWeb3: Boolean(state?.web3),
          commitType: typeof store.commit,
          commitKeys: store.commit ? Object.keys(store.commit) : [],
          hasWalletCommit: Boolean(walletCommit),
          walletCommitKeys: walletCommit ? Object.keys(walletCommit) : [],
          stateKeys: state ? Object.keys(state) : [],
        };
      });
    }
    if (consoleErrors.length > 0) {
      throw new Error(
        `Console errors detected: ${consoleErrors.map((e) => e.text).join(' | ')} env=${JSON.stringify(storeDebug)}`
      );
    }
    if (!appState.hasContent || appState.offlineShell) {
      throw new Error(
        `App did not mount properly (hasContent=${appState.hasContent}, offlineShell=${appState.offlineShell}) env=${JSON.stringify(
          envDebug
        )} store=${JSON.stringify(storeDebug)}`
      );
    }

    const originRootHashLinks = await page.evaluate(() => {
      const selectors = ['.app-menu a[href^="/#"]', '.marketing a[href^="/#"]'];
      const links = [];

      for (const selector of selectors) {
        for (const anchor of Array.from(document.querySelectorAll(selector))) {
          const href = anchor.getAttribute('href');
          if (href) links.push(href);
        }
      }

      return Array.from(new Set(links));
    });

    if (originRootHashLinks.length > 0) {
      throw new Error(
        `Origin-root hash hrefs detected (breaks IPFS base paths): ${originRootHashLinks.join(', ')}`
      );
    }

    console.log('[ipfs-smoke] PASS', appState.title);
  } finally {
    await serveDist.close();
    await context.close();
    await browser.close();
  }
};

run().catch((error) => {
  console.error('[ipfs-smoke] FAIL', error);
  process.exitCode = 1;
});
