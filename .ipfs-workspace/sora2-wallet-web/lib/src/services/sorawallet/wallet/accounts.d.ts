import type { InjectedAccount, InjectedAccounts, Unsubcall } from '@polkadot/extension-inject/types';
import type { WithKeyring } from '@sora-substrate/sdk';
export default class Accounts implements InjectedAccounts {
  private api;
  private accountsList;
  constructor(api: WithKeyring);
  get(): Promise<InjectedAccount[]>;
  subscribe(accountsCallback: (accounts: InjectedAccount[]) => unknown): Unsubcall;
}
