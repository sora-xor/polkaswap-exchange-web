/// <reference lib="webworker" />

import { RealtimeDataPlaneCore } from '@/workers/realtime/core';

import type { DataPlaneWorkerIncomingMessage } from '@/services/realtime/protocol';

const worker = self as unknown as DedicatedWorkerGlobalScope;
const core = new RealtimeDataPlaneCore();
const CLIENT_ID = 'dedicated-main-client';

core.registerClient(CLIENT_ID, (message) => {
  worker.postMessage(message);
});

worker.onmessage = (event: MessageEvent<DataPlaneWorkerIncomingMessage>) => {
  void core.receive(CLIENT_ID, event.data);
};
