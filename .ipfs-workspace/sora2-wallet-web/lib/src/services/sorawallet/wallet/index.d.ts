import Accounts from './accounts';
import type { InjectedWindowProvider, Injected } from '@polkadot/extension-inject/types';
import type { WithKeyring } from '@sora-substrate/sdk';
export declare class SoraWallet implements InjectedWindowProvider {
  static readonly version = '0.0.1';
  readonly accounts: Accounts;
  constructor(api: WithKeyring);
  private get signer();
  enable(): Promise<Injected>;
}
