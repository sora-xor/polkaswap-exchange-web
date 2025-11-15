import Accounts from './accounts';
import type { InjectedWindowProvider, Injected } from '@polkadot/extension-inject/types';
/**
 * Minimal WalletConnect-like adapter that exposes Google Drive backups through
 * the polkadot extension interface expected by the wallet infrastructure.
 */
declare class GoogleDriveWallet implements InjectedWindowProvider {
  static readonly version = '0.0.1';
  private access;
  readonly accounts: Accounts;
  constructor();
  private get signer();
  /**
   * Requests Drive access and exposes the accounts wrapper so the caller can
   * manage encrypted backups like regular extension accounts.
   */
  enable(): Promise<Injected>;
}
export declare const GDriveWallet: GoogleDriveWallet;
/** Adds the Google Drive wallet to the registry if the app is configured for it. */
export declare const addGDriveWalletLocally: (dAppName: string) => void;
export {};
