import Accounts from './accounts';

import type { InjectedWindowProvider, Injected } from '@polkadot/extension-inject/types';
import type { WithKeyring } from '@sora-substrate/sdk';

export class SoraWallet implements InjectedWindowProvider {
  public static readonly version = '0.0.1';

  public readonly accounts!: Accounts;

  constructor(api: WithKeyring) {
    this.accounts = new Accounts(api);
  }

  private get signer(): Injected['signer'] {
    return null as unknown as Injected['signer'];
  }

  async enable(): Promise<Injected> {
    return {
      accounts: this.accounts,
      metadata: undefined,
      provider: undefined,
      signer: this.signer,
    };
  }
}
