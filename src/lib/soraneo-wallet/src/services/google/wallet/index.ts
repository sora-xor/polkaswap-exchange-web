import { AppWallet } from '../../../consts';
import { addWalletLocally } from '../../../services/wallet';
import { GDriveStorage } from '../index';

import Accounts from './accounts';

import type { InjectedWindowProvider, Injected } from '@polkadot/extension-inject/types';

/**
 * Minimal WalletConnect-like adapter that exposes Google Drive backups through
 * the polkadot extension interface expected by the wallet infrastructure.
 */
class GoogleDriveWallet implements InjectedWindowProvider {
  public static readonly version = '0.0.1';

  private access = false;
  public readonly accounts!: Accounts;

  constructor() {
    this.accounts = new Accounts();
  }

  private get signer(): Injected['signer'] {
    return (this.access ? null : undefined) as unknown as Injected['signer'];
  }

  /**
   * Requests Drive access and exposes the accounts wrapper so the caller can
   * manage encrypted backups like regular extension accounts.
   */
  async enable(): Promise<Injected> {
    try {
      await GDriveStorage.auth();
      this.access = true;
    } catch {
      this.access = false;
    }

    return {
      accounts: this.accounts,
      metadata: undefined,
      provider: undefined,
      signer: this.signer,
    };
  }

  /**
   * Loads the Google clients before the user clicks the wallet row. This keeps
   * the later token prompt inside the browser's click activation window.
   */
  async prepare(): Promise<void> {
    if (!GDriveStorage.hasKey || GDriveStorage.ready) return;

    await GDriveStorage.init();
  }
}

export const GDriveWallet = new GoogleDriveWallet();

/** Adds the Google Drive wallet to the registry if the app is configured for it. */
export const addGDriveWalletLocally = (dAppName: string) => {
  if (!GDriveStorage.hasKey) return;

  addWalletLocally(GDriveWallet, AppWallet.GoogleDrive, dAppName);
};
