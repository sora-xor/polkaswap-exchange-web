import { expect, test, type Page } from '@playwright/test';

type HarnessEvent = { type: string; data?: unknown };
type HarnessWindow = Window & {
  __discoveryHarness: {
    events: HarnessEvent[];
    seedComplete: () => Promise<void>;
    seedRich: () => Promise<void>;
    seedHoldoutOverlap: () => Promise<void>;
    clearHoldoutOverlaps: () => Promise<void>;
    setReviewLifetime: (milliseconds: number) => void;
    stored: () => Promise<{ status: string; idea: string } | null>;
  };
};

/** Read only test-fixture events; API requests and wallet signatures are impossible in this harness. */
async function harnessEvents(page: Page): Promise<HarnessEvent[]> {
  return page.evaluate(() => (window as HarnessWindow).__discoveryHarness.events);
}

test('research pauses to IndexedDB and requires provider reconnection after reload', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:41879/')) remoteRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByTestId('bot-discovery')).toBeVisible();
  await expect(page.getByTestId('discovery-start')).toBeDisabled();

  await page.getByTestId('discovery-provider').selectOption('custom');
  await page.getByTestId('discovery-endpoint').fill('https://offline.invalid/discovery');
  await page.getByTestId('discovery-connect').click();
  await expect(page.getByTestId('discovery-start')).toBeEnabled();
  await page.getByTestId('discovery-idea').fill('Buy only after completed-hour signals');
  await page.getByTestId('discovery-start').click();
  await expect(page.getByTestId('discovery-pause')).toBeVisible();
  await page.getByTestId('discovery-pause').click();
  await expect(page.getByTestId('discovery-resume')).toBeVisible();
  expect(await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.stored())).toMatchObject({
    status: 'paused',
    idea: 'Buy only after completed-hour signals',
  });

  await page.reload();
  await expect(page.getByTestId('discovery-resume')).toBeDisabled();
  await expect(page.getByTestId('discovery-idea')).toHaveValue('Buy only after completed-hour signals');
  await expect(page.getByTestId('discovery-saved-provider')).toContainText('bots.discovery.custom');
  await page.getByTestId('discovery-provider').selectOption('custom');
  await page.getByTestId('discovery-endpoint').fill('https://offline.invalid/discovery');
  await page.getByTestId('discovery-connect').click();
  await expect(page.getByTestId('discovery-resume')).toBeEnabled();
  await page.getByTestId('discovery-resume').click();
  await expect(page.getByTestId('discovery-pause')).toBeVisible();
  await page.getByTestId('discovery-pause').click();
  await expect(page.getByTestId('discovery-resume')).toBeVisible();
  const names = (await harnessEvents(page)).map((event) => event.type);
  expect(names).toContain('research-resume');
  expect(names).toContain('research-pause');
  expect(names).not.toContain('unexpected-ai-call');
  expect(remoteRequests).toEqual([]);
  await expect(page.getByTestId('discovery-new-run')).toBeVisible();
  await page.getByTestId('discovery-new-run').click();
  await expect.poll(() => page.evaluate(() => (window as HarnessWindow).__discoveryHarness.stored())).toBeNull();
});

test('overlapping holdout is disclosed before a request or checkpoint clear', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.seedHoldoutOverlap());
  await page.getByTestId('discovery-provider').selectOption('custom');
  await page.getByTestId('discovery-endpoint').fill('https://offline.invalid/discovery');
  await page.getByTestId('discovery-connect').click();
  await page.getByTestId('discovery-start').click();
  const preflight = page.getByTestId('discovery-holdout-preflight');
  await expect(preflight).toBeVisible();
  await expect(preflight).toContainText('Sep 9, 2026');
  expect((await harnessEvents(page)).filter((event) => event.type === 'research-start')).toHaveLength(0);
  await expect.poll(() => page.evaluate(() => (window as HarnessWindow).__discoveryHarness.stored())).toBeNull();
  await page.getByTestId('discovery-confirm-exploratory').click();
  await expect(page.getByTestId('discovery-pause')).toBeVisible();
  expect((await harnessEvents(page)).filter((event) => event.type === 'research-start')).toHaveLength(1);
  await page.getByTestId('discovery-pause').click();

  // A completed checkpoint exposes New search. Reload removes the in-memory acknowledgement.
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.seedComplete());
  await page.reload();
  await expect(page.getByTestId('discovery-new-run')).toBeVisible();
  await page.getByTestId('discovery-new-run').click();
  await expect(preflight).toBeVisible();
  expect(await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.stored())).toMatchObject({
    status: 'complete',
  });
  expect((await harnessEvents(page)).filter((event) => event.type === 'checkpoint-clear')).toHaveLength(0);
  await page.getByTestId('discovery-confirm-exploratory').click();
  await expect.poll(() => page.evaluate(() => (window as HarnessWindow).__discoveryHarness.stored())).toBeNull();
  expect((await harnessEvents(page)).filter((event) => event.type === 'checkpoint-clear')).toHaveLength(1);
  await expect(page.getByTestId('discovery-visuals-empty')).toBeVisible();
});

test('reconnecting with a different provider requires an explicit switch', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('discovery-provider').selectOption('custom');
  await page.getByTestId('discovery-endpoint').fill('https://offline.invalid/discovery');
  await page.getByTestId('discovery-connect').click();
  await page.getByTestId('discovery-start').click();
  await page.getByTestId('discovery-pause').click();
  await page.reload();

  await expect(page.getByTestId('discovery-saved-provider')).toContainText('bots.discovery.custom');
  await page.getByTestId('discovery-provider').selectOption('claude');
  await page.getByTestId('discovery-api-key').fill('offline-fixture-only');
  await page.getByTestId('discovery-connect').click();
  await page.getByTestId('discovery-resume').click();
  const decision = page.getByTestId('discovery-provider-switch');
  await expect(decision).toBeVisible();
  expect((await harnessEvents(page)).filter((event) => event.type === 'research-resume')).toHaveLength(0);
  await page.getByTestId('discovery-confirm-provider-switch').click();
  await expect(page.getByTestId('discovery-pause')).toBeVisible();
  const resumed = (await harnessEvents(page)).find((event) => event.type === 'research-resume');
  expect(resumed?.data).toMatchObject({ kind: 'claude', model: 'offline-model' });
  await page.getByTestId('discovery-pause').click();
});

test('finalist approval needs funding review and consent; campaign pause, unlock and close stay explicit', async ({
  page,
}) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:41879/')) remoteRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByTestId('bot-discovery')).toBeVisible();
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.seedComplete());
  await page.reload();
  await expect(page.getByTestId('discovery-candidates')).toBeVisible();
  await expect(page.getByTestId('discovery-coverage')).toHaveAttribute('data-ready', '1');
  await expect(page.getByTestId('discovery-training-point')).toHaveCount(1);
  await expect(page.getByTestId('discovery-holdout-point')).toHaveCount(1);
  const point = page.getByTestId('discovery-training-point');
  await expect
    .poll(() => point.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(27.9);
  const candidateId = await point.getAttribute('data-candidate-id');
  expect(candidateId).toBeTruthy();
  await point.click();
  const focusedCandidate = page.locator(`.discovery-candidate[data-candidate-id="${candidateId}"]`);
  await expect(focusedCandidate).toHaveClass(/is-focused/);
  await expect(focusedCandidate.locator('.discovery-candidate-select')).toHaveAttribute('aria-pressed', 'false');
  const spotlight = page.getByTestId('discovery-candidate-spotlight');
  await expect(spotlight).toBeVisible();
  await expect(spotlight.locator('[data-period="training"]')).toContainText('3%');
  await expect(spotlight.locator('[data-period="holdout"]')).toContainText('3%');
  await expect(point).toBeInViewport();
  await spotlight.getByTestId('discovery-spotlight-view').click();
  await expect(focusedCandidate).toBeFocused();
  await page.locator('.discovery-candidate-select').click();
  const comparison = page.getByTestId('discovery-finalist-compare');
  await expect(comparison).toBeVisible();
  await expect(comparison.getByTestId('discovery-finalist-card')).toHaveAttribute('data-finalist-id', candidateId!);
  await expect(comparison).toContainText('3%');
  await expect(comparison).toContainText('12');
  await page.getByTestId('discovery-review').click();
  await expect(page.getByTestId('discovery-authorize')).toHaveCount(0);
  await page.getByTestId('discovery-shared-cap').fill('10');
  await page.getByTestId('discovery-check').click();
  await expect(page.getByTestId('discovery-funding')).toContainText('#123');
  await expect(page.getByTestId('discovery-authorize')).toBeDisabled();
  await page.getByTestId('discovery-password').fill('only-in-memory');
  await page.getByTestId('discovery-consent').check();
  await page.getByTestId('discovery-authorize').click();
  await expect(page.getByTestId('discovery-live')).toContainText('bots.discovery.campaignStatus.running');
  const campaignProgress = page.getByTestId('discovery-campaign-progress');
  await expect(campaignProgress).toBeVisible();
  await expect(campaignProgress.getByRole('progressbar')).toHaveCount(3);
  await expect(campaignProgress).toContainText('0.00');
  await expect(campaignProgress).toContainText('0 / 10');
  await expect(page.getByTestId('discovery-password')).toHaveCount(0);

  const pauseButton = page.getByRole('button', { name: 'bots.discovery.pauseCampaign' });
  expect((await pauseButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await pauseButton.click();
  await expect(page.getByTestId('discovery-live')).toContainText('bots.discovery.campaignStatus.paused');
  await page.getByRole('button', { name: 'bots.discovery.reviewResume' }).click();
  const resumeReview = page.getByTestId('discovery-resume-review');
  await expect(resumeReview).toContainText('#123');
  await expect(page.getByTestId('discovery-resume-authorize')).toBeDisabled();
  await resumeReview.locator('input[type="password"]').fill('new-memory-grant');
  await resumeReview.locator('input[type="checkbox"]').check();
  await page.getByTestId('discovery-resume-authorize').click();
  await expect(page.getByTestId('discovery-live')).toContainText('bots.discovery.campaignStatus.running');

  await page.getByRole('button', { name: 'bots.discovery.pauseCampaign' }).click();
  await page.getByRole('button', { name: 'bots.discovery.closeCampaign' }).click();
  await expect(page.getByTestId('discovery-close-confirm')).toBeVisible();
  expect((await page.getByTestId('discovery-confirm-close').boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.getByTestId('discovery-confirm-close').click();
  await expect(page.getByTestId('discovery-live')).toContainText('bots.discovery.campaignStatus.closed');
  const events = await harnessEvents(page);
  expect(events.filter((event) => event.type === 'campaign-prepare')).toHaveLength(1);
  expect(events.filter((event) => event.type === 'campaign-authorize')).toHaveLength(2);
  expect(events.filter((event) => event.type === 'campaign-pause')).toHaveLength(2);
  expect(events.filter((event) => event.type === 'campaign-close')).toHaveLength(1);
  expect(events.map((event) => event.type)).not.toContain('unexpected-ai-call');
  expect(remoteRequests).toEqual([]);
});

test('expired funding review stays visible and refresh preserves the selected campaign', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.seedComplete());
  await page.reload();
  await page.locator('.discovery-candidate-select').click();
  await page.getByTestId('discovery-review').click();
  await page.getByTestId('discovery-shared-cap').fill('10');
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.setReviewLifetime(1_400));
  await page.getByTestId('discovery-check').click();
  const expiry = page.getByTestId('discovery-review-expiry');
  await expect(expiry).toBeVisible();
  await expect(expiry.getByTestId('discovery-review-timer')).toBeVisible();
  await expect(expiry.getByTestId('discovery-review-expired')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('discovery-authorize')).toHaveCount(0);
  await expect(page.getByTestId('discovery-shared-cap')).toHaveValue('10');
  await expect(page.getByTestId('discovery-funding')).toContainText('#123');
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.setReviewLifetime(60_000));
  await expiry.getByTestId('discovery-review-refresh').click();
  await expect(expiry.getByTestId('discovery-review-timer')).toBeVisible();
  await expect(page.getByTestId('discovery-authorize')).toBeDisabled();
  await expect(page.getByTestId('discovery-shared-cap')).toHaveValue('10');
  await expect(page.getByTestId('discovery-funding')).toContainText('#123');
  expect((await harnessEvents(page)).filter((event) => event.type === 'campaign-prepare')).toHaveLength(2);
  expect((await harnessEvents(page)).filter((event) => event.type === 'campaign-authorize')).toHaveLength(0);
});

test('mobile finalist comparison keeps measured evidence readable without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.seedComplete());
  await page.reload();
  await page.locator('.discovery-candidate-select').click();
  const comparison = page.getByTestId('discovery-finalist-compare');
  await expect(comparison).toBeVisible();
  await expect(comparison).toContainText('3%');
  await expect(comparison).toContainText('12');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const metricSize = await comparison
    .locator('.compare-metrics td')
    .first()
    .evaluate((cell) => Number.parseFloat(getComputedStyle(cell).fontSize));
  expect(metricSize).toBeGreaterThanOrEqual(12);
  await comparison.screenshot({ path: testInfo.outputPath('mobile-finalist-compare.png') });
});

test('crowded results remain inspectable and same-pair finalists keep their rule identity', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => (window as HarnessWindow).__discoveryHarness.seedRich());
  await page.reload();

  const chart = page.getByTestId('discovery-visuals');
  await expect(chart.getByTestId('discovery-window')).toContainText('2026-06-25');
  await expect(chart.getByTestId('discovery-training-point')).toHaveCount(4);
  await expect(chart.getByTestId('discovery-holdout-point')).toHaveCount(3);
  const first = chart.locator('[data-testid="discovery-training-point"][data-candidate-id="candidate-1"]');
  const second = chart.locator('[data-testid="discovery-training-point"][data-candidate-id="candidate-2"]');
  const interrupted = chart.locator('[data-testid="discovery-training-point"][data-candidate-id="candidate-4"]');
  await expect(interrupted).toHaveAttribute('aria-label', /-0\.00001%/);
  await expect(chart.locator('[data-testid="discovery-holdout-point"][data-candidate-id="candidate-4"]')).toHaveCount(
    0
  );

  const separated = async () => {
    const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
    if (!a || !b) return false;
    return a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
  };
  await expect.poll(separated).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(separated).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await first.focus();
  await first.press('Enter');
  await expect(chart.getByTestId('discovery-candidate-spotlight')).toHaveAttribute('data-candidate-id', 'candidate-1');
  await expect(chart.getByTestId('discovery-spotlight-view')).toBeFocused();

  await second.click();
  const spotlight = chart.getByTestId('discovery-candidate-spotlight');
  await expect(spotlight).toHaveAttribute('data-candidate-id', 'candidate-2');
  await expect(spotlight.locator('[data-period="training"]')).toContainText('3.00001%');
  await expect(spotlight.locator('[data-period="holdout"]')).toContainText('1.5%');
  await expect(second).toBeInViewport();
  await chart.screenshot({ path: testInfo.outputPath('mobile-populated-chart.png') });
  await interrupted.click();
  await expect(spotlight).toHaveAttribute('data-candidate-id', 'candidate-4');
  await expect(spotlight).not.toContainText('17.123456789012345678');
  await expect(spotlight.locator('[data-period="holdout"]')).toHaveCount(0);
  await expect(page.getByTestId('discovery-candidates')).not.toContainText('17.123456789012345678');

  await page.locator('.discovery-candidate[data-candidate-id="candidate-2"] .discovery-candidate-select').click();
  await page.locator('.discovery-candidate[data-candidate-id="candidate-1"] .discovery-candidate-select').click();
  const comparison = page.getByTestId('discovery-finalist-compare');
  const cards = comparison.getByTestId('discovery-finalist-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute('data-finalist-id', 'candidate-2');
  await expect(cards.nth(1)).toHaveAttribute('data-finalist-id', 'candidate-1');
  await expect(cards.nth(0).getByTestId('discovery-finalist-strategy')).toContainText('bots.strategies.threshold');
  await expect.poll(() => cards.nth(1).evaluate((card) => Number(getComputedStyle(card).opacity))).toBe(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await comparison.screenshot({ path: testInfo.outputPath('mobile-populated-comparison.png') });
});
