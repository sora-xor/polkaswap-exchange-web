#!/usr/bin/env node
const electronStub = global.__IPFS_CHECK_ELECTRON__ || require('electron');
const { app, BrowserWindow } = electronStub;

const DEFAULT_GATEWAY = 'http://127.0.0.1:8080/ipfs';
const DEFAULT_ROUTE = '#/swap';
const DEFAULT_SELECTOR = '#app';
const LOAD_TIMEOUT = 60000;

// The sandboxed CI runners we use do not provide GPU / window server access, so ensure
// Electron renders in pure software mode and drops privilege elevation attempts.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

const IGNORED_CONSOLE_PATTERNS = [
  /Electron Security Warning/i,
  /Cannot redefine property: \$route/i,
  /Cannot set property .*\$router/i,
  /\[createApp\] Failed to install plugin/i,
];

async function captureOfflineShell(webContents, selector) {
  try {
    const offline = await webContents.executeJavaScript(
      `(() => {
        const offlineEl = document.querySelector('.offline-shell');
        if (!offlineEl) {
          return null;
        }
        const text = (offlineEl.textContent || '').trim();
        const html = (offlineEl.innerHTML || '').trim();
        const host = document.querySelector(${JSON.stringify(selector)}) ?? null;
        return {
          metrics: {
            textLength: text.length,
            htmlLength: html.length,
          },
          snapshot: offlineEl.outerHTML ?? null,
          hostSnapshot: host ? host.outerHTML ?? null : null,
        };
      })()`
    );
    return offline;
  } catch (error) {
    console.warn('[ipfs:check] Unable to capture offline shell', error.message || String(error));
    return null;
  }
}

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg, idx) => {
    if (!arg.startsWith('--')) return;
    const [key, value] = arg.includes('=') ? arg.split('=') : [arg, argv[idx + 1]];
    const normalized = key.slice(2);
    if (value && !value.startsWith('--')) {
      args[normalized] = value;
    } else if (key.includes('=')) {
      args[normalized] = value;
    } else {
      args[normalized] = true;
    }
  });
  return args;
}

function buildTargetUrl(opts) {
  if (opts.url) {
    return opts.url;
  }

  const cid = opts.cid;
  if (!cid) {
    throw new Error('Either `--cid` or `--url` must be provided.');
  }

  const gateway = (opts.gateway || DEFAULT_GATEWAY).replace(/\/?$/, '');
  const route = opts.route || DEFAULT_ROUTE;
  const normalizedCid = cid.replace(/^\/+/, '');
  const suffix = route.startsWith('#') || route.startsWith('?') ? `/index.html${route}` : `/index.html#${route}`;

  let url = `${gateway}/${normalizedCid}${suffix}`;
  if (url.includes('/index.html?')) {
    url = url.replace('/index.html?', '/index.html?ipfs-check=1&');
  } else {
    url = url.replace('/index.html', '/index.html?ipfs-check=1');
  }

  return url;
}

async function createWindow(targetUrl, selector) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setAudioMuted(true);
  await win.webContents.session.clearCache();

  return win;
}

function watchConsole(webContents) {
  const messages = [];
  webContents.on('console-message', (_event, level, message, line, sourceId) => {
    messages.push({ level, message, line, sourceId });
  });
  return messages;
}

function watchResponses(webContents) {
  const failures = [];
  webContents.session.webRequest.onCompleted((details) => {
    if (details.statusCode >= 400 && !details.url.startsWith('data:')) {
      failures.push({
        url: details.url,
        status: details.statusCode,
        method: details.method,
      });
    }
  });
  webContents.session.webRequest.onErrorOccurred((details) => {
    if (details.errorCode === -3) {
      return; // ignore ERR_ABORTED navigations triggered by hash routing
    }
    failures.push({
      url: details.url,
      status: details.error,
      method: details.method,
    });
  });
  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return;
    failures.push({
      url: validatedURL,
      status: `${errorCode} ${errorDescription}`.trim(),
      method: 'GET',
    });
  });
  return failures;
}

async function waitForContent(webContents, selector) {
  const start = Date.now();
  return webContents
    .executeJavaScript(
      `
    new Promise((resolve, reject) => {
      const targetSelector = ${JSON.stringify(selector)};
      const deadline = Date.now() + ${LOAD_TIMEOUT};
      const check = () => {
        const el = document.querySelector(targetSelector);
        const htmlLength = el ? el.innerHTML.trim().length : 0;
        const hasChildren = !!(el && el.children && el.children.length > 0);
        if (el && (hasChildren || htmlLength > 0)) {
          resolve({
            textLength: (el.textContent || '').trim().length,
            htmlLength,
          });
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Timed out waiting for content.'));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    })
  `,
      true
    )
    .catch((error) => {
      throw new Error(error.message || 'Timed out waiting for content.');
    });
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  let targetUrl;
  try {
    targetUrl = buildTargetUrl(args);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    app.exit(1);
    return;
  }

  const selector = args.selector || DEFAULT_SELECTOR;
  const status = {
    targetUrl,
    selector,
    console: [],
    failedRequests: [],
    content: null,
    offlineShell: null,
  };

  let win;
  try {
    win = await createWindow(targetUrl, selector);
    status.console = watchConsole(win.webContents);
    status.failedRequests = watchResponses(win.webContents);

    await win.loadURL(targetUrl, { httpReferrer: targetUrl });

    const waitResult = await waitForContent(win.webContents, selector).catch((error) => {
      status.error = error.message || 'Timed out waiting for content.';
      return null;
    });
    status.content = waitResult;

    if (!status.domSnapshot) {
      status.domSnapshot = await win.webContents
        .executeJavaScript(`document.querySelector(${JSON.stringify(selector)})?.outerHTML ?? null`)
        .catch(() => null);
    }

    if (!status.content || (status.content.textLength === 0 && status.content.htmlLength === 0)) {
      const offline = await captureOfflineShell(win.webContents, selector);
      if (offline) {
        status.content ??= offline.metrics;
        if (!status.content || status.content.textLength === 0) {
          status.content = offline.metrics;
        }
        if (!status.domSnapshot) {
          status.domSnapshot = offline.hostSnapshot ?? offline.snapshot;
        }
        status.offlineShell = offline.snapshot;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    status.error = status.error || error.message || String(error);
    if (win && !win.isDestroyed()) {
      const offline = await captureOfflineShell(win.webContents, selector);
      if (offline) {
        status.content ??= offline.metrics;
        if (!status.domSnapshot) {
          status.domSnapshot = offline.hostSnapshot ?? offline.snapshot;
        }
        status.offlineShell = offline.snapshot;
      }
    } else {
      try {
        const snapshotWin = await createWindow(targetUrl, selector);
        await snapshotWin.loadURL(targetUrl, { httpReferrer: targetUrl });
        const offline = await captureOfflineShell(snapshotWin.webContents, selector);
        if (offline) {
          status.content ??= offline.metrics;
          status.domSnapshot = offline.hostSnapshot ?? offline.snapshot;
          status.offlineShell = offline.snapshot;
        } else {
          status.domSnapshot = await snapshotWin.webContents
            .executeJavaScript(`document.querySelector(${JSON.stringify(selector)})?.outerHTML ?? null`)
            .catch(() => null);
        }
        await snapshotWin.destroy();
      } catch {
        status.domSnapshot = null;
      }
    }
  } finally {
    if (win && !win.isDestroyed()) {
      try {
        await win.destroy();
      } catch {
        // ignore destroy errors
      }
    }
  }

  const consoleErrors = status.console.filter((msg) => {
    if (msg.level < 2) return false;
    return !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(msg.message || ''));
  });
  const failedRequests = status.failedRequests;

  const issues = [];
  if (status.error) {
    issues.push(status.error);
  }
  if (!status.content || (status.content.textLength === 0 && status.content.htmlLength === 0)) {
    issues.push('App content did not render anything under the target selector.');
  }
  if (consoleErrors.length) {
    issues.push(`${consoleErrors.length} console error(s) detected.`);
  }
  if (failedRequests.length) {
    issues.push(`${failedRequests.length} failed network request(s).`);
  }

  const summary = {
    targetUrl: status.targetUrl,
    selector: status.selector,
    content: status.content,
    consoleErrors,
    failedRequests,
    domSnapshot: status.domSnapshot,
  };

  if (issues.length) {
    console.error('IPFS check failed:', issues.join(' '));
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log('IPFS check passed.');
    console.log(JSON.stringify(summary, null, 2));
  }

  app.exit(process.exitCode || 0);
}

if (require.main === module) {
  app.whenReady().then(run);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

module.exports = {
  DEFAULT_GATEWAY,
  DEFAULT_ROUTE,
  DEFAULT_SELECTOR,
  LOAD_TIMEOUT,
  parseArgs,
  buildTargetUrl,
  createWindow,
  watchConsole,
  watchResponses,
  waitForContent,
  captureOfflineShell,
  run,
};
