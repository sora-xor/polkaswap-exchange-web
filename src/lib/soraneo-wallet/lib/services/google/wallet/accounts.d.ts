import { InjectedAccount, InjectedAccounts, Unsubcall } from '@polkadot/extension-inject/types';
import { KeyringPair$Json } from '@polkadot/keyring/types';

/**
 * Implements the polkadot-js `InjectedAccounts` interface backed by Google
 * Drive storage, syncing encrypted backups to cloud files.
 */
export default class Accounts implements InjectedAccounts {
  private _list;
  private accountsCallback;
  private accountsUpdateInterval;
  private get accountsList();
  private set accountsList(value);
  /** Looks up the cached account metadata by a formatted address. */
  private findAccountByAddress;
  /** Retrieves the Drive file id for the given account address. */
  private getAccountIdByAddress;
  /** Stores a new encrypted backup derived from the provided keyring JSON. */
  add(accountPairJson: KeyringPair$Json, password: string, passphrase?: string): Promise<void>;
  /** Updates the human readable name for a stored backup. */
  changeName(address: string, name: string): Promise<void>;
  /** Removes the account backup from Drive and local cache. */
  delete(address: string): Promise<void>;
  /** Refreshes the local cache with the latest list of Drive backups. */
  get(): Promise<InjectedAccount[]>;
  /** Decrypts a specific backup file and returns a keyring JSON blob. */
  getAccount(address: string, password: string): Promise<Nullable<KeyringPair$Json>>;
  /** Implements the extension subscription mechanism with a simple polling loop. */
  subscribe(accountsCallback: (accounts: InjectedAccount[]) => unknown): Unsubcall;
  /** Stops the polling loop and clears the subscription callback. */
  unsubscribe(): void;
}
