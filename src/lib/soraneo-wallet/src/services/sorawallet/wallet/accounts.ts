import type { InjectedAccount, InjectedAccounts, Unsubcall } from '@polkadot/extension-inject/types';
import type { KeyringAddress } from '@polkadot/ui-keyring/types';
import type { WithKeyring } from '@sora-substrate/sdk';

const formatAccounts = (accounts: KeyringAddress[]): InjectedAccount[] => {
  return accounts.map((account) => ({
    address: account.address,
    name: account.meta.name ?? '',
  }));
};

const prepareAccounts = (accounts: KeyringAddress[]): InjectedAccount[] => {
  const filtered = accounts.filter((account) => !account.meta.isExternal);
  const formatted = formatAccounts(filtered);

  return formatted;
};

export default class Accounts implements InjectedAccounts {
  private api!: WithKeyring;
  private accountsList: InjectedAccount[] = [];

  constructor(api: WithKeyring) {
    this.api = api;
  }

  public async get(): Promise<InjectedAccount[]> {
    const accounts = this.api.getAccounts();

    this.accountsList = prepareAccounts(accounts);

    return this.accountsList;
  }

  public subscribe(accountsCallback: (accounts: InjectedAccount[]) => unknown): Unsubcall {
    const subscription = this.api.accountsObservable.subscribe((accounts) => {
      this.accountsList = prepareAccounts(accounts);
      accountsCallback(this.accountsList);
    });

    return () => subscription.unsubscribe();
  }
}
