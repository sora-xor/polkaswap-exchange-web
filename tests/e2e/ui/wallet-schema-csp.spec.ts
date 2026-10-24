import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'vite';

const root = resolve(__dirname, '../../..');
const resolvePackage = createRequire(resolve(root, 'package.json'));
const schemaPath = resolve(dirname(resolvePackage.resolve('@reown/appkit-wallet')), '../src/W3mFrameSchema.js');
const fixtureOrigin = 'https://wallet-schema.invalid';
const fixtureId = '\0wallet-schema-csp-fixture';
const contentSecurityPolicy = "default-src 'none'; script-src 'self';";

type CspViolation = { directive: string; blockedUri: string };
type ProbeWindow = Window & { __walletSchemaCspViolations: CspViolation[] };

/** Bundle the installed wallet schemas so the browser checks their actual constructor and parsing behavior. */
async function bundleWalletSchemas(): Promise<string> {
  const source = `
    import { W3mFrameSchema, FrameGetUserResponse } from ${JSON.stringify(schemaPath)};
    const request = {
      type: '@w3m-app/RPC_REQUEST',
      payload: { method: 'eth_sendTransaction', params: [{ to: '0x${'1'.repeat(40)}', value: '0x0' }] }
    };
    const oversized = { address: '0x123', chainId: 1, accounts: Array(2049).fill(null) };
    async function checkSchemas() {
      const valid = W3mFrameSchema.appEvent.safeParse(request);
      const validAsync = await W3mFrameSchema.appEvent.safeParseAsync(request);
      const invalid = FrameGetUserResponse.safeParse(oversized);
      const invalidAsync = await FrameGetUserResponse.safeParseAsync(oversized);
      document.querySelector('#result').textContent = JSON.stringify({
        valid: valid.success,
        validAsync: validAsync.success,
        method: valid.success ? valid.data.payload.method : null,
        oversizedRejected: !invalid.success,
        oversizedAsyncRejected: !invalidAsync.success,
        issues: invalid.success ? [] : invalid.error.issues.map(({ code, path }) => ({ code, path })),
        asyncIssues: invalidAsync.success ? [] : invalidAsync.error.issues.map(({ code, path }) => ({ code, path }))
      });
      document.documentElement.dataset.walletSchemaReady = 'true';
    }
    void checkSchemas();
  `;
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'wallet-schema-csp-fixture',
        resolveId: (id) => (id === fixtureId ? id : null),
        load: (id) => (id === fixtureId ? source : null),
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: fixtureId, output: { format: 'iife' } },
    },
  });
  if (Array.isArray(result) || !('output' in result)) throw new Error('Expected one wallet schema bundle');
  const chunk = result.output.find((output) => output.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('Wallet schema bundle was not emitted');
  return chunk.code;
}

test('loads and validates real wallet schemas without dynamic code under a strict CSP', async ({ page }) => {
  const script = await bundleWalletSchemas();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const unexpectedRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const violations: CspViolation[] = [];
    (window as ProbeWindow).__walletSchemaCspViolations = violations;
    window.addEventListener('securitypolicyviolation', (event) => {
      violations.push({ directive: event.effectiveDirective, blockedUri: event.blockedURI });
    });
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url === `${fixtureOrigin}/`) {
      await route.fulfill({
        contentType: 'text/html',
        headers: { 'Content-Security-Policy': contentSecurityPolicy },
        body: '<!doctype html><html><head><meta charset="utf-8"></head><body><pre id="result"></pre><script src="/schema.js"></script></body></html>',
      });
    } else if (url === `${fixtureOrigin}/schema.js`) {
      await route.fulfill({ contentType: 'application/javascript', body: script });
    } else {
      unexpectedRequests.push(url);
      await route.abort();
    }
  });

  const response = await page.goto(`${fixtureOrigin}/`);
  expect(response?.headers()['content-security-policy']).toBe(contentSecurityPolicy);
  await expect(page.locator('html')).toHaveAttribute('data-wallet-schema-ready', 'true');
  expect(JSON.parse((await page.locator('#result').textContent()) ?? 'null')).toEqual({
    valid: true,
    validAsync: true,
    method: 'eth_sendTransaction',
    oversizedRejected: true,
    oversizedAsyncRejected: true,
    issues: [{ code: 'too_big', path: ['accounts'] }],
    asyncIssues: [{ code: 'too_big', path: ['accounts'] }],
  });
  // CSP violation events are queued even when a library catches the blocked Function constructor.
  await page.evaluate(() => new Promise<void>((done) => setTimeout(done, 0)));
  expect(await page.evaluate(() => (window as ProbeWindow).__walletSchemaCspViolations)).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
});
