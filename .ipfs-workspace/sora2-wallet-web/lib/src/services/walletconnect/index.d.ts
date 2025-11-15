import { WcProvider } from './provider/base';
import type { Wallet } from '../wallet/types';
import type { WithKeyring } from '@sora-substrate/sdk';
export { WcProvider };
/** Tells whether a wallet entry represents a WalletConnect session. */
export declare const isWcWallet: (wallet: Wallet) => boolean;
/**
 * Ensures there is a WalletConnect entry for the provided chain API and
 * registers a disconnect handler that can clean up Vuex state.
 */
export declare const addWcSubWalletLocally: (chainApi: WithKeyring, onDisconnect: (source: string) => void) => string;
