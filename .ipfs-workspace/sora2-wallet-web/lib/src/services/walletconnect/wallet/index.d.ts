import WcAccounts from './accounts';
import WcSigner from './signer';
import type { WcProvider } from '../provider/base';
import type { InjectedWindowProvider, Injected } from '@polkadot/extension-inject/types';
export declare class WcWallet implements InjectedWindowProvider {
  static readonly version = '0.0.1';
  private access;
  readonly wcProvider: WcProvider;
  readonly wcAccounts: WcAccounts;
  readonly wcSigner: WcSigner;
  constructor(provider: WcProvider);
  private get signer();
  enable(): Promise<Injected>;
}
