/** Fixed, offline worker entry for the exact pinned runtime131 read-only host. */
'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const { createGoalTargetRuntimeHost } = require('./goal-target-runtime-host.cjs');

if (!parentPort) throw new Error('target-worker:worker-only');
try {
  if (
    !workerData ||
    Object.keys(workerData).sort().join(',') !== 'compressedBytes,kind' ||
    workerData.kind !== 'goal-target-runtime-worker-v1' ||
    !(workerData.compressedBytes instanceof Uint8Array)
  )
    throw new Error('invalid-worker-data');
  const host = createGoalTargetRuntimeHost(Buffer.from(workerData.compressedBytes));
  parentPort.on('message', (message) => {
    try {
      if (
        !message ||
        Object.keys(message).sort().join(',') !== 'id,kind,value' ||
        message.kind !== 'invoke' ||
        !Number.isSafeInteger(message.id) ||
        message.id < 1
      )
        throw new Error('invalid-request');
      parentPort.postMessage({ kind: 'result', id: message.id, result: host.invoke(message.value) });
    } catch {
      parentPort.postMessage({ kind: 'failure' });
    }
  });
  parentPort.postMessage({ kind: 'ready', profile: host.profile, metadataHex: host.metadataHex });
} catch {
  parentPort.postMessage({ kind: 'failure' });
}
