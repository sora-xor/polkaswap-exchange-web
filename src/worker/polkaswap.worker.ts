/// <reference lib="WebWorker" />

import { info, parseEvents, getApi } from './base';
import { WorkerEvent } from './events';

export type {};
declare const self: DedicatedWorkerGlobalScope;

const api = await getApi();

self.onmessage = async ({ data }) => {
  info('self.onmessage::' + data.command);
  switch (data.command) {
    case WorkerEvent.Close:
      info('Closing & api.disconnect');
      await api.disconnect();
      self.close();
      break;
    default:
      await parseEvents(self, api, data.command);
      break;
  }
};
