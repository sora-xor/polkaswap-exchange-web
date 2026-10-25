import { parseQuantArchive, runQuantLoop } from './quant-loop';
import type { QuantCosts, QuantLoopResult, QuantProgress } from './quant-loop';

/** Public archive text and chain costs only; wallets, keys and bot storage never reach this worker. */
export interface QuantWorkerRequest {
  id: string;
  archive: string;
  costs: QuantCosts;
  now: number;
}

export type QuantWorkerResponse =
  | { id: string; type: 'progress'; progress: QuantProgress }
  | { id: string; type: 'complete'; result: QuantLoopResult }
  | { id: string; type: 'error'; error: string };

let running = false;

self.onmessage = (event: MessageEvent<QuantWorkerRequest>): void => {
  if (running) return;
  running = true;
  const { id, archive, costs, now } = event.data;
  const send = (response: QuantWorkerResponse) => self.postMessage(response);
  void Promise.resolve()
    .then(() =>
      runQuantLoop(parseQuantArchive(JSON.parse(archive) as unknown), costs, {
        now,
        onProgress: (progress) => send({ id, type: 'progress', progress }),
      })
    )
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
      running = false;
    });
};
