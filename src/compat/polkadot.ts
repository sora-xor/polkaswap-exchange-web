import { ApiPromise as ApiPromiseEsm, WsProvider as WsProviderEsm } from '@polkadot/api';
import { decodeAddress as decodeAddressEsm } from '@polkadot/util-crypto';

import { connection } from '@/lib/soraneo-wallet/src/api';

type ApiPromiseCtor = typeof ApiPromiseEsm;
type WsProviderCtor = typeof WsProviderEsm;
type DecodeAddressFn = typeof decodeAddressEsm;

type WalletConnectionExports = {
  ApiPromise?: ApiPromiseCtor;
  WsProvider?: WsProviderCtor;
};

const applyConnection = (connection: WalletConnectionExports | undefined) => {
  if (!connection) return;

  if (connection.ApiPromise) {
    ApiPromise = connection.ApiPromise;
  }

  if (connection.WsProvider) {
    WsProvider = connection.WsProvider;
  }
};

let ApiPromise: ApiPromiseCtor = ApiPromiseEsm;
let WsProvider: WsProviderCtor = WsProviderEsm;
export const decodeAddress: DecodeAddressFn = decodeAddressEsm;

applyConnection(connection as WalletConnectionExports | undefined);

export const polkadotReady: Promise<void> = Promise.resolve();

export { ApiPromise, WsProvider };

export const polkadotCompat = {
  get ApiPromise() {
    return ApiPromise;
  },
  get WsProvider() {
    return WsProvider;
  },
  decodeAddress,
};

export const polkadotCjs = polkadotCompat;
