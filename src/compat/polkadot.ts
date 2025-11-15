import { ApiPromise as ApiPromiseEsm, WsProvider as WsProviderEsm } from '@polkadot/api';
import { decodeAddress as decodeAddressEsm } from '@polkadot/util-crypto';

import { getWalletCore, loadWalletCore } from '@/utils/walletCore';

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

try {
  const wallet = getWalletCore() as { connection?: WalletConnectionExports } | undefined;
  applyConnection(wallet?.connection);
} catch {
  // Wallet core not yet available; will be resolved asynchronously below.
}

export const polkadotReady: Promise<void> = loadWalletCore()
  .then((wallet) => {
    applyConnection((wallet as { connection?: WalletConnectionExports } | undefined)?.connection);
  })
  .catch(() => undefined);

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
