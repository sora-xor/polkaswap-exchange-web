import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ensureAppLoaded, ipfsBasePath } from './support/ipfs';

test.use({ trace: 'off' });
test.skip(process.env.PS_E2E_LIVE_NETWORK !== '1', 'This suite reads actual SORA history and fees.');

for (const browserName of ['chromium', 'webkit'] as const) {
  for (const forceCanvas of [false, true]) {
    test(`Live SORA particles ${browserName} ${forceCanvas ? 'Canvas fallback' : 'automatic GPU'}: computation and context loss preserve accounting`, async ({
      playwright,
      baseURL,
    }) => {
      test.setTimeout(180_000);
      const browser = await playwright[browserName].launch();
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        locale: 'en-US',
        timezoneId: 'UTC',
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      const failedRequests: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(baseURL!)) failedRequests.push(new URL(request.url()).pathname);
      });
      page.on('response', (response) => {
        if (response.url().startsWith(baseURL!) && response.status() >= 400)
          failedRequests.push(`${response.status()} ${new URL(response.url()).pathname}`);
      });
      try {
        await page.addInitScript((disabled) => {
          localStorage.setItem('dexSettings.disclaimerApprove', 'true');
          if (!disabled) return;
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
            if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
            return Reflect.apply(original, this, [type, ...args]);
          } as typeof original;
        }, forceCanvas);
        await page.goto(`${baseURL}${ipfsBasePath}/#/bots`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await ensureAppLoaded(page);
        await page.getByTestId('backtesting-tab').click();
        await expect(page.getByTestId('research-costs')).toBeVisible({ timeout: 120_000 });
        await expect(page.locator('.bots-error')).toHaveCount(0);
        await expect(page.getByTestId('research-history-range')).toContainText('2026-03-01');
        const playground = page.getByTestId('bot-playground');
        const distribution = page.getByTestId('trade-distribution');
        const stage = page.locator('.distribution-stage');
        const metrics = page.locator('.research-metrics');
        await expect(distribution).toBeVisible({ timeout: 120_000 });
        await expect(playground).toHaveAttribute('aria-busy', 'true');
        await expect(page.getByTestId('distribution-scrub')).toHaveCount(0);
        await expect(page.getByTestId('distribution-play')).toHaveCount(0);
        const backend = await distribution.getAttribute('data-renderer');
        const gpuCapable = await page.evaluate(() => {
          const probe = document.createElement('canvas');
          const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
          if (!gl) return false;
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          return true;
        });
        expect(backend).toBe(gpuCapable ? 'webgl2' : 'canvas2d');
        await page.getByTestId('distribution-canvas').scrollIntoViewIfNeeded();
        await page.mouse.move(5, 5);
        const initialProcessed = Number(await metrics.getAttribute('data-processed-trades'));
        await expect
          .poll(async () => Number(await metrics.getAttribute('data-processed-trades')), { timeout: 15_000 })
          .toBeGreaterThan(initialProcessed);
        // Observe only public DOM evidence and browser paints: the evaluator owns the animation clock.
        const samples = await distribution.evaluate(
          (element) =>
            new Promise<{ interval: number; checkpoint: number; progress: number; running: boolean }[]>((resolve) => {
              const result: { interval: number; checkpoint: number; progress: number; running: boolean }[] = [];
              let previous = 0;
              const collect = (timestamp: number) => {
                if (previous)
                  result.push({
                    interval: timestamp - previous,
                    checkpoint: Number(element.getAttribute('data-calculation-checkpoint')),
                    progress: Number(element.getAttribute('data-calculation-progress')),
                    running: element.closest('[data-testid="bot-playground"]')?.getAttribute('aria-busy') === 'true',
                  });
                previous = timestamp;
                if (result.length < 120) requestAnimationFrame(collect);
                else resolve(result);
              };
              requestAnimationFrame(collect);
            })
        );
        expect(samples.every((sample) => sample.running)).toBe(true);
        expect(samples.some((sample) => sample.progress > 0 && sample.progress < 1)).toBe(true);
        expect(new Set(samples.map((sample) => sample.checkpoint)).size).toBeGreaterThan(1);
        expect(samples.every((sample, index) => !index || sample.checkpoint >= samples[index - 1].checkpoint)).toBe(
          true
        );
        const movingBefore = await stage.screenshot();
        await page.waitForTimeout(80);
        const movingAfter = await stage.screenshot();
        await expect(playground).toHaveAttribute('aria-busy', 'true');
        expect(
          movingBefore.equals(movingAfter),
          'Histogram counts must visibly change as actual study outcomes arrive.'
        ).toBe(false);

        const validationFrames = await playground.evaluate(
          (element) =>
            new Promise<number[]>((resolve) => {
              const intervals: number[] = [];
              let previous = performance.now();
              const observe = (timestamp: number) => {
                const scope = element.querySelector('[data-testid="validation-progress"]')?.getAttribute('data-scope');
                if (scope === 'train' || scope === 'test') intervals.push(timestamp - previous);
                previous = timestamp;
                if (element.getAttribute('aria-busy') === 'false') resolve(intervals);
                else requestAnimationFrame(observe);
              };
              requestAnimationFrame(observe);
            })
        );
        expect(
          validationFrames.length,
          'Validation must yield frames while its real progress is visible.'
        ).toBeGreaterThan(5);
        await expect(playground).toHaveAttribute('aria-busy', 'false', { timeout: 120_000 });
        await expect(page.getByTestId('playground-error')).toHaveCount(0);
        await expect(page.getByTestId('playground-history-coverage')).toContainText('100.00%');
        await expect(distribution).toHaveAttribute('data-calculation-progress', '1.000');
        const count = Number(await page.getByTestId('research-ledger').locator('h3 small').textContent());
        expect(count).toBeGreaterThan(1000);
        expect(count).toBeLessThanOrEqual(10000);
        await expect(metrics).toHaveAttribute('data-processed-trades', String(count));
        await expect(page.getByTestId('distribution-count')).toContainText(String(count));
        const bins = await page
          .getByTestId('distribution-bin-data')
          .locator('tbody tr')
          .evaluateAll((rows) =>
            rows.map((row) => ({
              count: Number(row.getAttribute('data-count')),
              selected: Number(row.getAttribute('data-selected-count')),
              excluded: Number(row.getAttribute('data-excluded-count')),
            }))
          );
        expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(count);
        expect(bins.every((bin) => bin.count === bin.selected + bin.excluded)).toBe(true);
        expect(bins.reduce((sum, bin) => sum + bin.selected, 0)).toBe(
          Number(await page.getByTestId('research-executions').textContent())
        );
        const countScale = await distribution.getAttribute('data-histogram-maximum');
        await page.getByTestId('distribution-view-selected').click();
        await expect(distribution).toHaveAttribute('data-histogram-maximum', countScale!);
        await page.getByTestId('distribution-view-all').click();
        await expect(page.getByTestId('research-validation')).toHaveValue('walk-forward');
        await expect(page.getByTestId('validation-report').locator('tbody tr')).toHaveCount(3);
        await expect(page.getByTestId('validation-beat-benchmark')).toContainText('/ 3');

        const accounting = await metrics.textContent();
        const costs = await page.getByTestId('research-costs').textContent();
        const checkpoint = await distribution.getAttribute('data-calculation-checkpoint');
        const frozenBefore = await stage.screenshot();
        await page.waitForTimeout(300);
        const frozenAfter = await stage.screenshot();
        expect(frozenBefore.equals(frozenAfter), 'Completed candidate pixels must stay frozen.').toBe(true);
        const output = path.resolve('output/playwright/bots-webgl');
        await mkdir(output, { recursive: true });
        const name = `${browserName}-${forceCanvas ? 'fallback' : 'automatic'}`;
        await writeFile(path.join(output, `${name}-moving-before.png`), movingBefore);
        await writeFile(path.join(output, `${name}-moving-after.png`), movingAfter);
        await writeFile(path.join(output, `${name}.png`), frozenAfter);
        if (backend === 'webgl2') {
          const lost = await page.getByTestId('distribution-particles').evaluate((canvas) => {
            const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
            const extension = gl?.getExtension('WEBGL_lose_context');
            if (!extension) return false;
            extension.loseContext();
            return true;
          });
          expect(lost, 'The test browser must support simulated GPU context loss.').toBe(true);
          await expect(distribution).toHaveAttribute('data-renderer', 'canvas2d');
          await expect(distribution).toHaveAttribute('data-calculation-progress', '1.000');
          await expect(distribution).toHaveAttribute('data-calculation-checkpoint', checkpoint!);
          await expect(metrics).toHaveAttribute('data-processed-trades', String(count));
          await expect(page.locator('.research-metrics')).toHaveText(accounting!);
          await expect(page.getByTestId('research-costs')).toHaveText(costs!);
          await page.locator('.distribution-stage').screenshot({ path: path.join(output, `${name}-context-loss.png`) });
        }
        await page.getByTestId('distribution-canvas').press('End');
        await expect(page.getByTestId('distribution-focused')).toContainText(`Candidate ${count} of ${count}`);
        await expect(page.getByTestId('research-inspector')).toBeVisible();
        await expect(metrics).toHaveAttribute('data-processed-trades', String(count));
        await expect(metrics).toHaveText(accounting!);
        await expect(page.getByTestId('research-costs')).toHaveText(costs!);
        await page.getByTestId('validation-report').screenshot({ path: path.join(output, `${name}-validation.png`) });
        await page.setViewportSize({ width: 390, height: 844 });
        const rotationNotice = page.getByRole('button', { name: /yes,? i understand/i });
        const noticeAppeared = await rotationNotice
          .waitFor({ state: 'visible', timeout: 3000 })
          .then(() => true)
          .catch(() => false);
        if (noticeAppeared) {
          await rotationNotice.click();
          await expect(rotationNotice).toBeHidden();
        }
        await page.getByTestId('distribution-canvas').press('Home');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page
          .getByTestId('trade-distribution')
          .screenshot({ path: path.join(output, `${name}-mobile-distribution.png`) });
        await page
          .getByTestId('validation-report')
          .screenshot({ path: path.join(output, `${name}-mobile-validation.png`) });
        const sorted = samples.map((sample) => sample.interval).sort((a, b) => a - b);
        const evidence = {
          url: page.url(),
          backend,
          gpuCapable,
          forceCanvas,
          candidates: count,
          observedCheckpoints: new Set(samples.map((sample) => sample.checkpoint)).size,
          observedInFlightFrames: samples.filter((sample) => sample.progress > 0 && sample.progress < 1).length,
          motionPixelsChanged: !movingBefore.equals(movingAfter),
          completedPixelsFrozen: frozenBefore.equals(frozenAfter),
          frameIntervalMedianMs: sorted[Math.floor(sorted.length / 2)],
          frameIntervalP95Ms: sorted[Math.floor(sorted.length * 0.95)],
          frameIntervalMaxMs: sorted.at(-1),
          framesOver50Ms: sorted.filter((interval) => interval > 50).length,
          histogramCandidates: bins.reduce((sum, bin) => sum + bin.count, 0),
          validationFolds: 3,
          validationFrames: validationFrames.length,
          validationFrameMaxMs: Math.max(...validationFrames),
          errors,
          failedRequests,
        };
        await writeFile(path.join(output, `${name}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
        console.info(JSON.stringify(evidence));
        expect(errors).toEqual([]);
        expect(failedRequests).toEqual([]);
      } finally {
        await context.close();
        await browser.close();
      }
    });
  }
}
