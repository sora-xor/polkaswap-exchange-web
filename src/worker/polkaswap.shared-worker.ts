/// <reference lib="WebWorker" />

import { info, getApi, parseEvents } from './base';
import { WorkerEvent } from './events';

export type {};
declare const self: SharedWorkerGlobalScope;

const connections: Array<MessagePort> = [];

self.onconnect = (event) => {
  try {
    const port = event.ports[0];
    port.onmessage = async function ({ data }) {
      info('MESSAGE');
      switch (data.command) {
        // Tab closed, remove port
        case WorkerEvent.Close:
          info('shared::Closing...');
          if (!connections.length) {
            info('shared::api.disconnect');
            await api.disconnect();
          }
          connections.splice(connections.indexOf(port), 1);
          break;
        default:
          await parseEvents(port, api, data.command);
          break;
      }
    };
    port.onmessageerror = function (event) {
      console.error(`Error: ${event.data}`);
    };
    port.start();
    connections.push(event.ports[0]);
    info('connected::' + connections.length);
  } catch (error) {
    console.error(error);
  }
};
// connected should be before api initialization
const api = await getApi();
