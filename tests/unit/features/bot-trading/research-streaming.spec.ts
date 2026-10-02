import { afterEach, describe, expect, it, vi } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { awaitResearchPaint, RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import type {
  ResearchWorkerMessage,
  ResearchWorkerRequest,
  ResearchWorkerResponse,
} from '@/features/bot-trading/research-runner';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('research presentation backpressure', () => {
  it('waits for an actual paint boundary and aborts before a pending frame can advance computation', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const frames: FrameRequestCallback[] = [];
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', cancel);
    let presented = false;
    const ready = awaitResearchPaint().then(() => {
      presented = true;
    });
    expect(frames).toHaveLength(1);
    frames[0](1);
    await Promise.resolve();
    expect(presented).toBe(false);
    expect(frames).toHaveLength(2);
    frames[1](2);
    await ready;
    expect(presented).toBe(true);
    const controller = new AbortController();
    const cancelled = awaitResearchPaint(controller.signal);
    controller.abort();
    await expect(cancelled).rejects.toThrow('bots.errors.stale');
    expect(cancel).toHaveBeenCalledWith(3);
  });

  it('streams genuine worker slices only after matching checkpoint acknowledgements and finishes without playback', async () => {
    const sent: ResearchWorkerResponse[] = [];
    const worker = {
      onmessage: undefined as ((event: MessageEvent<ResearchWorkerMessage>) => void) | undefined,
      postMessage: (message: ResearchWorkerResponse) => sent.push(message),
    };
    vi.stubGlobal('self', worker);
    await import('@/features/bot-trading/research.worker');
    const now = Date.UTC(2026, 8, 14, 12);
    const request: ResearchWorkerRequest = {
      id: 'worker-study',
      settings: {
        ...RESEARCH_DEFAULT_SETTINGS,
        historyStartAt: undefined,
        historyEndAt: now,
        validation: 'none',
        networkFeeXor: '0.1',
        swapFeePercent: '0',
        sellNetworkFeeXor: '0.1',
        sellSwapFeePercent: '0',
      },
      assets: [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals })),
      history: {
        denominationVerified: true,
        missing: 0,
        candles: Array.from({ length: 66 }, (_, index) => ({
          timestamp: now - (65 - index) * 3_600_000,
          close: index % 2 ? '2' : '3',
        })),
      },
      now,
    };
    const message = (data: ResearchWorkerMessage) => worker.onmessage!({ data } as MessageEvent<ResearchWorkerMessage>);
    message(request);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'progress', partial: { checkpoint: 1, completed: 32 } });
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    message({ id: request.id, type: 'acknowledge', checkpoint: 2 });
    message({ id: 'wrong-study', type: 'acknowledge', checkpoint: 1 });
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    for (let checkpoint = 1; checkpoint <= 3; checkpoint++) {
      message({ id: request.id, type: 'acknowledge', checkpoint });
      await vi.waitFor(() => expect(sent).toHaveLength(checkpoint + 1));
      if (checkpoint < 3)
        expect(sent.at(-1)).toMatchObject({ type: 'progress', partial: { checkpoint: checkpoint + 1 } });
    }
    const completion = sent.at(-1)!;
    expect(completion.type).toBe('complete');
    if (completion.type !== 'complete') throw new Error('missing completion');
    expect(completion.result).toEqual(
      runResearch(request.settings, request.assets, { kind: 'historical', history: request.history }, now)
    );
    const evaluated = sent.flatMap((event) => (event.type === 'progress' ? event.partial.candidates : []));
    expect(evaluated).toEqual(completion.result.candidates);
    expect(sent.map((event) => event.type)).toEqual(['progress', 'progress', 'progress', 'complete']);
  });

  it('runs the actual worker with the same goal, signal warmup and output cap as direct evaluation', async () => {
    vi.resetModules();
    const sent: ResearchWorkerResponse[] = [];
    const worker = {
      onmessage: undefined as ((event: MessageEvent<ResearchWorkerMessage>) => void) | undefined,
      postMessage(message: ResearchWorkerResponse) {
        sent.push(message);
        if (message.type === 'progress')
          queueMicrotask(() =>
            this.onmessage!({
              data: { id: message.id, type: 'acknowledge', checkpoint: message.partial.checkpoint },
            } as MessageEvent<ResearchWorkerMessage>)
          );
      },
    };
    vi.stubGlobal('self', worker);
    await import('@/features/bot-trading/research.worker');
    const hour = 3_600_000;
    const now = Date.UTC(2026, 8, 14, 12);
    const request: ResearchWorkerRequest = {
      id: 'worker-goal',
      settings: {
        ...RESEARCH_DEFAULT_SETTINGS,
        historyStartAt: now - 24 * hour,
        historyEndAt: now,
        validation: 'none',
        optimize: false,
        networkFeeXor: '0.1',
        swapFeePercent: '0',
        sellNetworkFeeXor: '0.1',
        sellSwapFeePercent: '0',
      },
      assets: [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals })),
      history: {
        denominationVerified: true,
        missing: 0,
        candles: Array.from({ length: 25 }, (_, index) => ({
          timestamp: now - (24 - index) * hour,
          close: index % 2 ? '2' : '3',
        })),
      },
      goal: {
        title: 'Grow output',
        targetReturnPercent: '5',
        maxLossPercent: '5',
        durationMs: 24 * hour,
        valuationAsset: 'output',
        lossMetric: 'drawdown',
      },
      warmupCandles: [{ timestamp: now - 25 * hour, close: '2' }],
      outputTradeLimitCodec: '7000000000000000000',
      now,
    };
    worker.onmessage!({ data: request } as MessageEvent<ResearchWorkerMessage>);
    await vi.waitFor(() => expect(sent.at(-1)?.type).toBe('complete'));
    const completion = sent.at(-1)!;
    if (completion.type !== 'complete') throw new Error('missing completion');
    expect(completion.result).toEqual(
      runResearch(request.settings, request.assets, { kind: 'historical', history: request.history }, now, {
        goal: request.goal,
        warmupCandles: request.warmupCandles,
        outputTradeLimitCodec: request.outputTradeLimitCodec,
      })
    );
    expect(completion.result.bot.goal).toEqual(request.goal);
    expect(completion.result.bot.policy.maxTradeCodec[VAL.address]).toBe(request.outputTradeLimitCodec);
    expect(completion.result.source.history.candles).toHaveLength(25);
  });
});
