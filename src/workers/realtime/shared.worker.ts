/// <reference lib="webworker" />

import { RealtimeDataPlaneCore } from '@/workers/realtime/core';

import type { DataPlaneWorkerIncomingMessage } from '@/services/realtime/protocol';

const worker = self as unknown as SharedWorkerGlobalScope;
const core = new RealtimeDataPlaneCore();

let clientSequence = 0;

worker.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  const clientId = `shared-port-${clientSequence++}`;

  core.registerClient(clientId, (message) => {
    port.postMessage(message);
  });

  port.onmessage = (messageEvent: MessageEvent<DataPlaneWorkerIncomingMessage>) => {
    void core.receive(clientId, messageEvent.data);
  };

  port.start();
};
