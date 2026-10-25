import type { WcProvider } from '../provider/base';
import type { InjectedAccount, InjectedAccounts, Unsubcall } from '@polkadot/extension-inject/types';

const ACCOUNTS_UPDATE_INTERVAL = 60_000;

export default class WcAccounts implements InjectedAccounts {
  private wcProvider!: WcProvider;

  private _list: InjectedAccount[] = [];
  private accountsCallbacks = new Map<number, (accounts: InjectedAccount[]) => unknown>();
  private accountsUpdateInterval: Nullable<ReturnType<typeof setInterval>> = null;
  private nextSubscriptionId = 0;
  private pollingGeneration = 0;

  constructor(wcProvider: WcProvider) {
    this.wcProvider = wcProvider;
  }

  private get accountsList(): InjectedAccount[] {
    return this._list;
  }

  private set accountsList(accounts: InjectedAccount[]) {
    this._list = accounts;

    for (const callback of this.accountsCallbacks.values()) {
      callback(this._list);
    }
  }

  /** Starts one shared poll loop for all active account subscribers. */
  private startPolling(): void {
    if (this.accountsUpdateInterval !== null) return;

    const generation = ++this.pollingGeneration;
    this.accountsUpdateInterval = setInterval(() => {
      if (generation !== this.pollingGeneration) return;

      void this.get().catch(() => undefined);
    }, ACCOUNTS_UPDATE_INTERVAL);
  }

  /** Stops the shared poll loop and invalidates a callback already queued by it. */
  private stopPolling(): void {
    this.pollingGeneration += 1;

    if (this.accountsUpdateInterval !== null) {
      clearInterval(this.accountsUpdateInterval);
      this.accountsUpdateInterval = null;
    }
  }

  public async get(): Promise<InjectedAccount[]> {
    const accountAddresses = this.wcProvider.getAccounts();

    this.accountsList = accountAddresses.map((address) => ({ address }));

    return this.accountsList;
  }

  public subscribe(accountsCallback: (accounts: InjectedAccount[]) => unknown): Unsubcall {
    const subscriptionId = ++this.nextSubscriptionId;
    let active = true;

    this.accountsCallbacks.set(subscriptionId, accountsCallback);
    this.startPolling();

    return () => {
      if (!active) return;

      active = false;
      this.accountsCallbacks.delete(subscriptionId);

      if (!this.accountsCallbacks.size) {
        this.stopPolling();
      }
    };
  }

  public unsubscribe(): void {
    this.accountsCallbacks.clear();
    this.stopPolling();
  }
}
