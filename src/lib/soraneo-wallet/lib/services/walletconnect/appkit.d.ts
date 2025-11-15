import { ChainNamespace } from '@reown/appkit-common';
import { ChainId } from './provider/base';

type WalletConnectModalState = {
  open: boolean;
};
export type WalletConnectModal = {
  openModal: (options?: { uri?: string }) => Promise<void>;
  closeModal: () => Promise<void>;
  subscribeModal: (callback: (state: WalletConnectModalState) => void) => () => void;
};
type EnsureModalConfig = {
  projectId: string;
  namespace: ChainNamespace;
  chains: ChainId[];
  optionalChains?: ChainId[];
};
/**
 * Lazily creates (or reuses) an AppKit instance configured for the provided
 * WalletConnect namespace and returns a minimal modal bridge compatible with
 * the existing provider API.
 */
export declare const ensureWalletConnectModal: (config: EnsureModalConfig) => Promise<WalletConnectModal>;
/**
 * Clears the cached AppKit instance to ensure isolation between tests.
 */
export declare const resetWalletConnectModalCache: () => void;
export {};
