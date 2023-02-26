import { ApiPromise } from '@polkadot/api';
import { WsProvider } from '@polkadot/rpc-provider';
import { options } from '@sora-substrate/api';
import type { Asset } from '@sora-substrate/util/build/assets/types';

import { SendEvent, ReceiveEvent } from './events';

export const info = (message: string) => console.info('WORKER::' + message);

export async function getApi() {
  const providerAutoConnectMs = 0;
  const endpoint = 'wss://ws.framenode-2.s2.dev.sora2.soramitsu.co.jp';
  const provider = new WsProvider(endpoint, providerAutoConnectMs);
  const api = new ApiPromise(options({ provider }));
  api.connect();
  await api.isReady;
  info('Connected to ' + endpoint);
  return api;
}

export async function parseEvents(
  worker: DedicatedWorkerGlobalScope | MessagePort,
  api: ApiPromise,
  message: SendEvent
): Promise<void> {
  if (message === SendEvent.GetAssets) {
    info(SendEvent.GetAssets + '::started');
    const allAssets = (await api.query.assets.assetInfos.entries()).map(([key, codec]) => {
      const address = key.args[0].code.toString();
      const [symbol, name, decimals, _, content, description] = codec.toHuman() as any;
      return { address, symbol, name, decimals: +decimals, content, description };
    }) as Array<Asset>;
    worker.postMessage({ command: ReceiveEvent.GetAssets, res: allAssets });
  }
}
