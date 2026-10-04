// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { defaultStudioState } from '@/features/bot-trading/quant-studio';
import type { StudioWorkerRequest, StudioWorkerResponse } from '@/features/bot-trading/quant-studio.worker';
import observedFees from '../../../fixtures/bot-trading/mainnetFees20260914.json';

const COSTS = { networkFeeXor: observedFees.networkFeeXor, swapFeePercent: '0.6', slippagePercent: '0.5' };
const posted: StudioWorkerResponse[] = [];
const scope = globalThis as unknown as { self?: unknown };
const previous = scope.self;
let handle: (event: { data: StudioWorkerRequest }) => void;

/** Send a message and wait for the worker to answer it. */
async function send(message: StudioWorkerRequest): Promise<StudioWorkerResponse> {
  const before = posted.length;
  handle({ data: message });
  await vi.waitFor(() => expect(posted.length).toBeGreaterThan(before), { timeout: 20_000 });
  return posted[posted.length - 1];
}

beforeAll(async () => {
  const fake = { postMessage: (response: StudioWorkerResponse) => posted.push(response), onmessage: null as unknown };
  scope.self = fake;
  await import('@/features/bot-trading/quant-studio.worker');
  handle = fake.onmessage as typeof handle;
});
afterAll(() => {
  scope.self = previous;
});

describe('studio worker', () => {
  it('refuses jobs before an archive is loaded', async () => {
    const response = await send({
      id: 1,
      type: 'job',
      job: { type: 'replay', market: 'PSWAP', state: defaultStudioState(), costs: COSTS },
    });
    expect(response).toEqual({ id: 1, type: 'error', error: 'bots.errors.history' });
  });

  it('loads the archive once, then answers quick jobs and stepped grids by id', async () => {
    const archive = await readFile(
      path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
      'utf8'
    );
    const loaded = await send({ id: 2, type: 'load', archive });
    expect(loaded.type).toBe('loaded');
    const replay = await send({
      id: 3,
      type: 'job',
      job: { type: 'replay', market: 'PSWAP', state: defaultStudioState(), costs: COSTS },
    });
    expect(replay.id).toBe(3);
    expect(replay.type === 'result' && replay.result.type).toBe('replay');
    const grid = await send({
      id: 4,
      type: 'job',
      job: { type: 'grid', market: 'DAI', state: defaultStudioState('breakout'), costs: COSTS },
    });
    expect(grid.type === 'result' && grid.result.type === 'grid' && grid.result.grid.rows).toBeGreaterThan(0);
    const thin = await send({
      id: 5,
      type: 'job',
      job: { type: 'replay', market: 'ETH', state: defaultStudioState(), costs: COSTS },
    });
    expect(thin).toEqual({ id: 5, type: 'error', error: 'bots.errors.config' });
    const malformed = await send({ id: 6, type: 'load', archive: '{"not":"an archive"}' });
    expect(malformed).toEqual({ id: 6, type: 'error', error: 'bots.errors.history' });
  }, 60_000);
});
