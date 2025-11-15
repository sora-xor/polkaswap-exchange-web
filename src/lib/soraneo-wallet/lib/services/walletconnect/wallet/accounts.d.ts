import { WcProvider } from '../provider/base';
import { InjectedAccount, InjectedAccounts, Unsubcall } from '@polkadot/extension-inject/types';

export default class WcAccounts implements InjectedAccounts {
  private wcProvider;
  private _list;
  private accountsCallback;
  private accountsUpdateInterval;
  constructor(wcProvider: WcProvider);
  private get accountsList();
  private set accountsList(value);
  get(): Promise<InjectedAccount[]>;
  subscribe(accountsCallback: (accounts: InjectedAccount[]) => unknown): Unsubcall;
  unsubscribe(): void;
}
