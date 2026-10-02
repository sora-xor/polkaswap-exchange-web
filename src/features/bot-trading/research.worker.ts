import { runResearchAsync } from './research';
import type { ResearchWorkerMessage, ResearchWorkerResponse } from './research-runner';

let running = false;
let pending: { id: string; checkpoint: number; resolve: () => void } | undefined;

/** A worker handles public prices and settings only; wallet, provider keys and bot storage stay outside this module. */
self.onmessage = (event: MessageEvent<ResearchWorkerMessage>): void => {
  if ('type' in event.data) {
    if (
      event.data.type === 'acknowledge' &&
      pending?.id === event.data.id &&
      pending.checkpoint === event.data.checkpoint
    ) {
      const resume = pending.resolve;
      pending = undefined;
      resume();
    }
    return;
  }
  if (running) return;
  running = true;
  const { id, settings, assets, history, now, strategy, goal, warmupCandles, outputTradeLimitCodec } = event.data;
  const send = (response: ResearchWorkerResponse) => self.postMessage(response);
  void runResearchAsync(settings, assets, { kind: 'historical', history }, now, {
    strategy,
    ...(goal !== undefined ? { goal } : {}),
    ...(warmupCandles !== undefined ? { warmupCandles } : {}),
    ...(outputTradeLimitCodec !== undefined ? { outputTradeLimitCodec } : {}),
    awaitProgress: (partial) =>
      new Promise<void>((resolve) => {
        pending = { id, checkpoint: partial.checkpoint, resolve };
        send({ id, type: 'progress', partial });
      }),
  })
    .then(
      (result) => send({ id, type: 'complete', result }),
      (error) =>
        send({
          id,
          type: 'error',
          error:
            error instanceof Error && /^bots\.errors\.[\w-]+$/.test(error.message)
              ? error.message
              : 'bots.errors.history',
        })
    )
    .finally(() => {
      pending = undefined;
      running = false;
    });
};
