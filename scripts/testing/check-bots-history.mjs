import { chromium, webkit } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir, writeFile } from 'node:fs/promises';

/**
 * Exercise an unsigned XOR/DAI preview in disposable profiles, preserving the user's sessions.
 * Run with BOTS_VERIFY_URL pointing to an existing IPFS preview or https://polkaswap.io/.
 * BOTS_VERIFY_OUTPUT selects the evidence directory. This never starts a bot or connects a wallet.
 */
const base = process.env.BOTS_VERIFY_URL || 'http://127.0.0.1:41733/ipfs/polkaswap-e2e/';
const output = process.env.BOTS_VERIFY_OUTPUT || 'output/bots-expanded/real-history';
assert.ok(['127.0.0.1', 'localhost', 'polkaswap.io'].includes(new URL(base).hostname));
await mkdir(output, { recursive: true });
const report = { base, started: new Date().toISOString(), realMarketHistory: true, cases: [] };
for (const [browserName, launcher] of Object.entries({ chromium, webkit })) {
  const browser = await launcher.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const result = { browserName, passed: false, errors: [], failedRequests: [], submittedExtrinsics: 0, rpc: [] };
  report.cases.push(result);
  page.on('pageerror', (error) => result.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') result.errors.push(message.text());
  });
  page.on('requestfailed', (request) => result.failedRequests.push({ url: request.url(), error: request.failure() }));
  page.on('websocket', (socket) => {
    socket.on('framesent', ({ payload }) => {
      try {
        const request = JSON.parse(String(payload));
        if (/author_submit/.test(request.method || '')) result.submittedExtrinsics++;
        if (/chain_getFinalizedHead|payment_queryInfo|liquidityProxy_quote/.test(request.method || ''))
          result.rpc.push({ at: Date.now(), endpoint: socket.url(), method: request.method });
      } catch {
        /* Binary frames are unrelated to these public JSON-RPC observations. */
      }
    });
  });
  try {
    await page.addInitScript(() => {
      localStorage.setItem('dexSettings.disclaimerApprove', 'true');
      localStorage.setItem('dexSettings.theme', 'light');
    });
    await page.goto(`${base.replace(/#.*$/, '')}#/bots`, { waitUntil: 'domcontentloaded' });
    const run = page.getByTestId('lab-run-batch');
    await run.waitFor({ timeout: 90_000 });
    const strategies = page.getByTestId('lab-strategy-picker').getByRole('button');
    assert.equal(await strategies.count(), 12);
    for (const strategy of await strategies.all()) assert.equal(await strategy.isVisible(), true);
    assert.equal(await page.locator('.bots-page details, .bots-page summary').count(), 0);
    await page.waitForFunction(
      () => document.querySelector('[data-testid="lab-output-token"]')?.options.length > 2,
      null,
      { timeout: 90_000 }
    );
    const token = page.getByTestId('lab-output-token');
    const dai = await token
      .locator('option')
      .evaluateAll((options) => options.find((option) => option.textContent.trim() === 'DAI')?.value);
    assert.ok(dai, 'DAI must be an eligible output token');
    await token.selectOption(dai);
    assert.equal(await page.getByTestId('lab-capital').inputValue(), '100');
    assert.equal(await page.getByTestId('lab-history-range').inputValue(), '90');
    assert.equal(await page.getByTestId('lab-quick-preset-sma').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByTestId('lab-interval-blocks').inputValue(), '10');
    assert.match(await page.getByTestId('your-bots-tab').innerText(), /0/);
    result.runStartedAt = Date.now();
    await run.click();
    await page.waitForFunction(
      () => document.querySelector('.experiment-card .state-complete, .experiment-card .state-error'),
      null,
      { timeout: 180_000 }
    );
    const card = page.getByTestId('experiment-card').first();
    result.durationMs = Date.now() - result.runStartedAt;
    result.state = await card.locator('.state-label').innerText();
    assert.equal(await card.locator('.state-complete').count(), 1, await card.innerText());
    result.finalValue = await card.getByTestId('experiment-final-value').innerText();
    result.returnPercent = await card.getByTestId('experiment-return').innerText();
    assert.match(result.finalValue, /\d/);
    assert.match(result.returnPercent, /\d/);
    const note = card.getByTestId('research-fee-note');
    assert.equal(await note.isVisible(), true);
    result.feeNote = await note.innerText();
    const timestamp = result.feeNote.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/);
    assert.ok(timestamp, 'Fee assumptions must show the observed finalized block time');
    result.finalizedAt = Date.parse(timestamp[1].replace(' ', 'T') + 'Z');
    result.finalizedAgeMs = Date.now() - result.finalizedAt;
    result.delayed = (await card.getByTestId('research-fee-delay').count()) === 1;
    if (result.finalizedAgeMs > 330_000) assert.equal(result.delayed, true);
    assert.equal(await card.getByTestId('trade-distribution').isVisible(), true);
    assert.equal(await page.locator('.bots-page details, .bots-page summary').count(), 0);
    await card.screenshot({ path: `${output}/${browserName}-result.png` });
    if (result.delayed) {
      await card.getByTestId('experiment-create').click();
      await page
        .getByText('Current fees or chain identity could not be verified for this study.', { exact: false })
        .waitFor({ timeout: 30_000 });
      result.liveReviewBlocked = true;
      assert.equal(await page.locator('[role="dialog"]').count(), 0);
      assert.match(await page.getByTestId('your-bots-tab').innerText(), /0/);
    }
    assert.equal(result.submittedExtrinsics, 0);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.failedRequests, []);
    result.passed = true;
  } catch (error) {
    result.failure = error.stack || String(error);
    result.body = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    await page.screenshot({ path: `${output}/${browserName}-failure.png` }).catch(() => {});
  } finally {
    await context.close();
    await browser.close();
    await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(result));
  }
}
report.passed = report.cases.every((result) => result.passed);
await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
