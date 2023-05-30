import { api } from '@soramitsu/soraneo-wallet-web';

(window as any).api = api;

export const subBridgeApi = api.bridgeProxy.sub;
