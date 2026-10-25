import { formatAccountAddress } from '../../../util';
import { BackupAccountMapper } from '../backup/mapper';
import { GDriveStorage } from '../index';

import type { EncryptedBackupAccount } from '../backup/types';
import type { InjectedAccount, InjectedAccounts, Unsubcall } from '@polkadot/extension-inject/types';
import type { KeyringPair$Json } from '@polkadot/keyring/types';

interface IAccountMetadata extends InjectedAccount {
  id: string;
}

const ACCOUNTS_UPDATE_INTERVAL = 60_000;

/** Converts an encrypted account into the file shape expected by Drive. */
const prepareAccountFile = (account: EncryptedBackupAccount) => {
  return {
    name: `${account.address}.json`,
    description: account.name,
    json: JSON.stringify(account),
  };
};

/**
 * Implements the polkadot-js `InjectedAccounts` interface backed by Google
 * Drive storage, syncing encrypted backups to cloud files.
 */
export default class Accounts implements InjectedAccounts {
  private _list: IAccountMetadata[] = [];
  private accountsCallbacks = new Map<number, (accounts: InjectedAccount[]) => unknown>();
  private accountsUpdateInterval: Nullable<ReturnType<typeof setInterval>> = null;
  private accountsRequestId = 0;
  private nextSubscriptionId = 0;
  private pollingGeneration = 0;

  private get accountsList(): IAccountMetadata[] {
    return this._list;
  }

  private set accountsList(accounts: IAccountMetadata[]) {
    this._list = accounts;

    for (const callback of this.accountsCallbacks.values()) {
      callback(this._list);
    }
  }

  /** Starts one shared Drive poll loop for all active subscribers. */
  private startPolling(): void {
    if (this.accountsUpdateInterval !== null) return;

    const generation = ++this.pollingGeneration;
    this.accountsUpdateInterval = setInterval(() => {
      void this.refresh(generation).catch(() => undefined);
    }, ACCOUNTS_UPDATE_INTERVAL);
  }

  /** Stops polling and invalidates any Drive request started by the old loop. */
  private stopPolling(): void {
    this.pollingGeneration += 1;

    if (this.accountsUpdateInterval !== null) {
      clearInterval(this.accountsUpdateInterval);
      this.accountsUpdateInterval = null;
    }
  }

  /**
   * Fetches Drive metadata while allowing only the latest request to update the
   * shared cache. Poll requests must also belong to the active poll generation.
   */
  private async refresh(pollingGeneration?: number): Promise<IAccountMetadata[]> {
    const requestId = ++this.accountsRequestId;
    const files = await GDriveStorage.getAll();
    const accounts = files
      ? files.map(({ id, name = '', description = '' }) => ({
          address: formatAccountAddress(name.replace(/\.json$/, ''), false), // formatted account address (extension like)
          name: description, // account name
          id: id as string,
        }))
      : [];
    const isCurrentPoll =
      pollingGeneration === undefined ||
      (pollingGeneration === this.pollingGeneration && this.accountsCallbacks.size > 0);

    if (requestId === this.accountsRequestId && isCurrentPoll) {
      this.accountsList = accounts;
    }

    return accounts;
  }

  /** Looks up the cached account metadata by a formatted address. */
  private findAccountByAddress(address: string): Nullable<IAccountMetadata> {
    const defaultAddress = formatAccountAddress(address, false);

    return this.accountsList.find((acc) => acc.address === defaultAddress);
  }

  /** Retrieves the Drive file id for the given account address. */
  private async getAccountIdByAddress(address: string): Promise<string> {
    const accounts = (await this.get()) as IAccountMetadata[];
    const defaultAddress = formatAccountAddress(address, false);
    const account = accounts.find((item) => item.address === defaultAddress);

    if (!account) throw new Error(`Account not found: ${address}`);

    return account.id;
  }

  /** Stores a new encrypted backup derived from the provided keyring JSON. */
  public async add(accountPairJson: KeyringPair$Json, password: string, passphrase?: string): Promise<void> {
    if (this.findAccountByAddress(accountPairJson.address)) return;

    const encryptedAccount = BackupAccountMapper.createFromPairJson(accountPairJson, password, passphrase);
    const fileData = prepareAccountFile(encryptedAccount);

    await GDriveStorage.create(fileData);
    await this.get();
  }

  /** Updates the human readable name for a stored backup. */
  public async changeName(address: string, name: string) {
    const id = await this.getAccountIdByAddress(address);
    const encryptedAccount = (await GDriveStorage.get(id)) as EncryptedBackupAccount;
    const updated = BackupAccountMapper.changeName(encryptedAccount, name);
    const fileData = prepareAccountFile(updated);

    await GDriveStorage.update(id, fileData);
    // if account name updated in storage, we don't need to do request, just update it locally
    this.accountsRequestId += 1;
    this.accountsList = this.accountsList.map((account) => ({
      ...account,
      name: account.id === id ? name : account.name,
    }));
  }

  /** Removes the account backup from Drive and local cache. */
  public async delete(address: string): Promise<void> {
    const id = await this.getAccountIdByAddress(address);

    await GDriveStorage.delete(id);
    // if account deleted in storage, we don't need to do request, just remove it locally
    this.accountsRequestId += 1;
    this.accountsList = this.accountsList.filter((account) => account.id !== id);
  }

  /** Refreshes the local cache with the latest list of Drive backups. */
  public async get(): Promise<InjectedAccount[]> {
    return this.refresh();
  }

  /** Decrypts a specific backup file and returns a keyring JSON blob. */
  public async getAccount(address: string, password: string): Promise<Nullable<KeyringPair$Json>> {
    const id = await this.getAccountIdByAddress(address);
    const encryptedAccount = (await GDriveStorage.get(id)) as EncryptedBackupAccount;
    const json = BackupAccountMapper.getPairJson(encryptedAccount, password);

    return json;
  }

  /** Implements the extension subscription mechanism with a simple polling loop. */
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

  /** Stops the polling loop and clears the subscription callback. */
  public unsubscribe(): void {
    this.accountsCallbacks.clear();
    this.stopPolling();
  }
}
