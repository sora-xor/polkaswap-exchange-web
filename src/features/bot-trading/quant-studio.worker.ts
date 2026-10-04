import { parseQuantArchive } from './quant-loop';
import {
  createStudioEngine,
  type StudioArchiveInfo,
  type StudioEngine,
  type StudioJob,
  type StudioJobResult,
} from './quant-studio';

/** Public archive text and chain costs only; wallets, keys and bot storage never reach this worker. */
export type StudioWorkerRequest =
  | { id: number; type: 'load'; archive: string }
  | { id: number; type: 'job'; job: StudioJob };

export type StudioWorkerResponse =
  | { id: number; type: 'loaded'; info: StudioArchiveInfo }
  | { id: number; type: 'result'; result: StudioJobResult }
  | { id: number; type: 'error'; error: string };

/** Rows simulated between yields, so exact replays can interleave with a large grid. */
const GRID_CHUNK = 160;

let engine: StudioEngine | null = null;

const send = (response: StudioWorkerResponse) => self.postMessage(response);
const code = (error: unknown) =>
  error instanceof Error && /^bots\.errors\.[\w-]+$/.test(error.message) ? error.message : 'bots.errors.history';
const yieldTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

self.onmessage = (event: MessageEvent<StudioWorkerRequest>): void => {
  const message = event.data;
  if (!message || typeof message.id !== 'number') return;
  void (async () => {
    try {
      if (message.type === 'load') {
        engine = createStudioEngine(parseQuantArchive(JSON.parse(message.archive) as unknown));
        send({ id: message.id, type: 'loaded', info: engine.info });
        return;
      }
      if (!engine) throw new Error('bots.errors.history');
      if (message.job.type === 'grid') {
        const builder = engine.grid(message.job);
        let grid = builder.step(GRID_CHUNK);
        while (!grid) {
          await yieldTask();
          grid = builder.step(GRID_CHUNK);
        }
        send({ id: message.id, type: 'result', result: { type: 'grid', grid } });
        return;
      }
      send({ id: message.id, type: 'result', result: engine.run(message.job) });
    } catch (error) {
      send({ id: message.id, type: 'error', error: code(error) });
    }
  })();
};
