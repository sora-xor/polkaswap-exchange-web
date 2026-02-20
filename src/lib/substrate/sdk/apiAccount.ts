import last from 'lodash/fp/last';
import first from 'lodash/fp/first';
import omit from 'lodash/fp/omit';
import { Keyring } from '@polkadot/ui-keyring';
import { assert, isHex, u8aToHex } from '@polkadot/util';
import { Observable, Subscriber, Subject } from 'rxjs';
import {
  base58Decode,
  decodeAddress,
  encodeAddress,
  cryptoWaitReady,
  mnemonicGenerate,
  keyExtractSuri,
  mnemonicValidate,
} from '@polkadot/util-crypto';
import { FPNumber, CodecString } from '@sora-substrate/math';
import type { KeypairType } from '@polkadot/util-crypto/types';
import type { Connection } from '@sora-substrate/connection';
import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { CreateResult, KeyringAddress } from '@polkadot/ui-keyring/types';
import type { KeyringPair, KeyringPair$Json, KeyringPair$Meta } from '@polkadot/keyring/types';
import type { Signer, ISubmittableResult } from '@polkadot/types/types';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';

import { decrypt, deriveAddressNamespaces, encrypt } from './crypto';
import { Messages } from './logger';
import { AccountStorage, Storage } from './storage';
import { Operation, TransactionStatus } from './types';

import type {
  AccountWithOptions,
  ISubmitExtrinsic,
  ExtrinsicEvent,
  AccountHistory,
  HistoryItem,
  CombinedHistoryItem,
  SaveHistoryOptions,
  OnChainIdentity,
} from './types';
import type { OriginalIdentity } from './staking/types';
import type { CommonPrimitivesAssetId32Override } from './typeOverrides';

// We don't need to know real account address for checking network fees
const mockAccountAddress = 'cnRuw2R6EVgQW3e4h8XeiFym2iU17fNsms15zRGcg9YEJndAs';

export const KeyringType = 'sr25519';

export const SoraPrefix = 69;

let keyring!: Keyring;

export const isLiquidityPoolOperation = (operation: Operation) =>
  [Operation.AddLiquidity, Operation.RemoveLiquidity].includes(operation);

export const isEthOperation = (operation: Operation) =>
  [Operation.EthBridgeIncoming, Operation.EthBridgeOutgoing].includes(operation);

export const isEvmOperation = (operation: Operation) =>
  [Operation.EvmIncoming, Operation.EvmOutgoing].includes(operation);

export const isSubstrateOperation = (operation: Operation) =>
  [Operation.SubstrateIncoming, Operation.SubstrateOutgoing].includes(operation);

export class WithConnectionApi {
  /** Connection class that provides Api */
  public connection!: Connection;

  public setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /** API instance for data requests. Should be used during the connection only */
  public get api(): ApiPromise {
    return this.connection.api as ApiPromise;
  }

  /** API RX instance for data subscriptions. Should be used during the connection only */
  public get apiRx(): ApiRx {
    return this.api.rx as ApiRx;
  }

  get connected(): boolean {
    return !!this.api?.isConnected;
  }

  get chainSymbol(): string | undefined {
    return this.api?.registry.chainTokens[0];
  }

  get chainDecimals(): number | undefined {
    return this.api?.registry.chainDecimals[0];
  }

  get chainSS58(): number | undefined {
    return this.api?.registry.chainSS58;
  }

  /**
   * Get on-chain account's identity
   * @param address account address
   */
  public async getAccountOnChainIdentity(address: string): Promise<OnChainIdentity | null> {
    const data = await this.api.query.identity.identityOf(address);

    if (data.isEmpty || data.isNone) return null;

    const result = data.unwrap();

    return {
      displayName: result.info.display.value.toHuman() as string,
      legalName: result.info.legal.value.toHuman() as string,
      approved: Boolean(result.judgements.length),
      identity: result.toHuman() as unknown as OriginalIdentity,
    };
  }

  /**
   * Format account address
   * @param withPrefix `true` by default
   */
  public formatAddress(address?: string, withPrefix = true): string {
    if (!address) return '';

    const publicKey = decodeAddress(address, false);

    if (withPrefix) {
      return encodeAddress(publicKey, this.chainSS58 ?? SoraPrefix);
    }

    return encodeAddress(publicKey);
  }

  /**
   * Validate account address
   * @param address
   */
  public validateAddress(address: string): boolean {
    try {
      base58Decode(address);
      decodeAddress(address, false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public key as hex string by account address
   * @param address
   * @returns
   */
  public getPublicKeyByAddress(address: string): string {
    const publicKey = decodeAddress(address, false);

    return u8aToHex(publicKey).replace(/^0x/, '');
  }

  /**
   * Generate unique string from value
   * @param value
   * @returns
   */

  // calldata + public key cosigner
  public encrypt(value: string): string {
    return encrypt(value);
  }

  // Подстветить ошибку в UI
  // и еще нужно анлочить пару
  // зашифрованная calldata, если приватник нашего косайнера совпадает с публичным то все парсим
  // , если не совпадает,то не распарсится
  public decrypt(value: string): string {
    return decrypt(value);
  }
}

export class WithAccountPair extends WithConnectionApi {
  public account?: CreateResult;
  public signer?: Signer;

  public mstAccount?: CreateResult;
  public mstActive: boolean = false;
  public previousAccount?: CreateResult;

  public get accountPair(): KeyringPair | null {
    return this.account?.pair ?? null;
  }

  public get accountJson(): KeyringPair$Json | null {
    return this.account?.json ?? null;
  }

  public get address(): string {
    return this.formatAddress(this.accountPair?.address);
  }

  /**
   * Set signer if the pair is locked (For polkadot js extension usage)
   * @param signer
   */
  public setSigner(signer: Signer): void {
    this.api.setSigner(signer);
    this.signer = signer;
  }

  /**
   * Set account data
   * @param account
   */
  public setAccount(account: CreateResult, _name?: string, _source?: string, _isExternal?: boolean): void {
    this.account = account;
  }

  /**
   * Unlock pair to sign tx
   * @param password
   */
  public unlockPair(password: string, pair = this.accountPair): void {
    pair?.unlock(password);
  }

  /**
   * Lock pair
   */
  public lockPair(pair = this.accountPair): void {
    if (!pair?.isLocked) {
      pair?.lock();
    }
  }

  public getAccountWithOptions(
    pair = this.accountPair,
    signer = this.signer
  ): AccountWithOptions | { account: undefined; options: {} } {
    if (!pair) return { account: undefined, options: {} };

    return {
      account: pair.isLocked ? pair.address : pair,
      options: {
        signer,
      },
    };
  }

  public logout(): void {
    this.signer = undefined;
    this.account = undefined;
  }

  public setMstAccount(account: CreateResult): void {
    this.mstAccount = account;
  }

  public switchToMstAccount(): void {
    this.previousAccount = this.account;
    this.mstActive = true;
  }

  public switchToMainAccount(): void {
    this.previousAccount = undefined;
    this.mstActive = false;
  }
}

export class WithKeyring extends WithAccountPair {
  public readonly seedLength = 12;
  public readonly type: KeypairType = KeyringType;

  private accountsSubject = new Subject<KeyringAddress[]>();

  public accountsObservable = this.accountsSubject.asObservable();

  protected emitAccountsUpdate() {
    this.accountsSubject.next(this.getAccounts());
  }

  public async initKeyring(silent = false): Promise<void> {
    keyring = new Keyring();

    try {
      await cryptoWaitReady();
    } catch (error) {
      // Some gateways enforce CSP policies that block WASM initialization.
      // Continue with JS crypto fallback instead of crashing wallet bootstrap.
      console.warn('[wallet] WASM crypto initialization failed. Falling back to JS crypto.', error);
    }

    try {
      // Restore accounts from keyring storage (localStorage)
      keyring.loadAll({ type: this.type });
    } catch (error) {
      // Dont throw "Unable to initialise options more than once" error in silent mode
      if (!silent) {
        throw error;
      }
    }
  }

  /**
   * Login to account
   * @param address account address
   * @param name account name
   * @param source wallet identity
   * @param isExternal is account from extension or not
   */
  public async loginAccount(address: string, name?: string, source?: string, isExternal?: boolean): Promise<void> {
    try {
      const meta = { name: name ?? '' };

      let account!: CreateResult | { pair: KeyringPair; json: null };

      if (isExternal) {
        account = keyring.addExternal(address, meta);
      } else {
        const accounts = this.getAccounts();

        if (!accounts.find((acc) => acc.address === address)) {
          // [Multiple Tabs] to restore accounts from keyring storage (localStorage)
          await this.initKeyring(true);
        }

        account = {
          pair: this.getAccountPair(address),
          json: null, // we don't need json here
        };
      }

      this.setAccount(account as CreateResult, name, source, isExternal);
    } catch (error) {
      console.error(error);
      this.logout();
    }
  }

  /**
   * Get all imported accounts.
   * It returns list of imported accounts
   * added via api.importAccount()
   */
  public getAccounts() {
    return keyring.getAccounts();
  }

  /**
   * Get already imported account pair by address
   * @param address account address
   */
  public getAccountPair(address: string): KeyringPair {
    const defaultAddress = this.formatAddress(address, false);

    return keyring.getPair(defaultAddress);
  }

  /**
   * Create an account pair
   * It could be added to account list using addAccountPair method
   * @param suri Seed of the account
   * @param name Name of the account
   */
  public createAccountPair(suri: string, name?: string): KeyringPair {
    const meta = { name: name ?? '' };

    return keyring.createFromUri(suri, meta, this.type);
  }

  /**
   * Import account using account pair
   * @param pair account pair to add
   * @param password account password
   */
  public addAccountPair(pair: KeyringPair, password: string): void {
    keyring.addPair(pair, password);
    this.emitAccountsUpdate();
  }

  /**
   * Create account pair from json
   * @param json account json
   * @param meta account meta
   */
  public createAccountPairFromJson(json: KeyringPair$Json, meta?: KeyringPair$Meta): KeyringPair {
    return keyring.createFromJson(json, meta);
  }

  /**
   * Restore from JSON object.
   * Adds it to keyring storage
   * It generates an error if JSON or/and password are not valid
   * @param json
   * @param password
   */
  public restoreAccountFromJson(json: KeyringPair$Json, password: string): { address: string; name: string } {
    const pair = keyring.restoreAccount(json, password);
    this.emitAccountsUpdate();
    return { address: pair.address, name: (pair.meta?.name ?? '') as string };
  }

  /**
   * Export a JSON with the account data
   * @param password
   * @param encrypted If `true` then it will be decrypted. `false` by default
   */
  public exportAccount(pair: KeyringPair, password: string, encrypted = false): string {
    const pass = encrypted ? this.decrypt(password) : password;

    return JSON.stringify(keyring.backupAccount(pair, pass));
  }

  /**
   * Change the account name
   * @param address account address
   * @param name New name
   */
  public changeAccountName(address: string, name: string): void {
    const pair = this.getAccountPair(address);

    keyring.saveAccountMeta(pair, { ...pair.meta, name });
    this.emitAccountsUpdate();
  }

  /**
   * Change the account password.
   * It generates an error if `oldPassword` is invalid
   * @param oldPassword
   * @param newPassword
   */
  public changeAccountPassword(oldPassword: string, newPassword: string): void {
    assert(this.accountPair, Messages.connectWallet);

    const pair = this.accountPair;
    try {
      if (!pair.isLocked) {
        pair.lock();
      }
      pair.decodePkcs8(oldPassword);
    } catch (error) {
      throw new Error('Old password is invalid');
    }
    keyring.encryptAccount(pair, newPassword);
    this.emitAccountsUpdate();
  }

  /**
   * Import account using credentials
   * @param suri Seed of the account
   * @param name Name of the account
   * @param password Password which will be set for the account
   */
  public addAccount(suri: string, name: string, password: string): CreateResult {
    const account = keyring.addUri(suri, password, { name }, this.type);
    this.emitAccountsUpdate();
    return account;
  }

  /**
   * Import account & login
   * @param suri Seed of the account
   * @param name Name of the account
   * @param password Password which will be set for the account
   */
  public importAccount(suri: string, name: string, password: string): void {
    const account = this.addAccount(suri, name, password);
    this.setAccount(account, name);
  }

  /**
   * Forget account from keyring
   * @param address account address to forget
   */
  public forgetAccount(address = this.address): void {
    if (address) {
      const defaultAddress = this.formatAddress(address, false);
      keyring.forgetAccount(defaultAddress);
      keyring.forgetAddress(defaultAddress);
      this.emitAccountsUpdate();
    }
  }

  /**
   * Create seed phrase. It returns `{ address, seed }` object.
   */
  public createSeed(): { address: string; seed: string } {
    const seed = mnemonicGenerate(this.seedLength);
    return {
      address: this.createAccountPair(seed).address,
      seed,
    };
  }

  /**
   * Before use the seed for wallet connection you may want to check its correctness
   * @param suri Seed which is set by the user
   */
  public checkSeed(suri: string): { address: string; suri: string } {
    const { phrase } = keyExtractSuri(suri);
    if (isHex(phrase)) {
      assert(isHex(phrase, 256), 'Hex seed is not 256-bits');
    } else {
      assert(String(phrase).split(' ').length === this.seedLength, `Mnemonic should contain ${this.seedLength} words`);
      assert(mnemonicValidate(phrase), 'There is no valid mnemonic seed');
    }
    return {
      address: this.createAccountPair(suri).address,
      suri,
    };
  }
}

export class WithStorage extends WithKeyring {
  /** Common data storage */
  public storage?: Storage;

  /**
   * Set storage if it should be used as data storage
   * @param storage
   */
  public setStorage(storage: Storage): void {
    this.storage = storage;
  }

  public override logout(): void {
    super.logout();
    this.storage?.clear();
  }
}

export class WithAccountStorage extends WithStorage {
  /** Account data storage */
  public accountStorage?: AccountStorage;

  public initAccountStorage() {
    if (!this.account?.pair?.address) return;
    // TODO: dependency injection ?
    if (this.storage) {
      const { current, legacy } = deriveAddressNamespaces(this.account.pair.address);
      this.accountStorage = new AccountStorage(current, legacy);
    }
  }

  public override setAccount(account: CreateResult, _name?: string, _source?: string, _isExternal?: boolean): void {
    super.setAccount(account);
    this.initAccountStorage();
  }

  public override logout(): void {
    super.logout();
    this.accountStorage = undefined;
  }
}

export class WithAccountHistory extends WithAccountStorage {
  constructor(public readonly historyNamespace = 'history') {
    super();
  }

  protected _history: AccountHistory<HistoryItem> = {};

  // methods for working with history
  public get history(): AccountHistory<HistoryItem> {
    if (this.accountStorage) {
      const history = this.accountStorage.get(this.historyNamespace);
      this._history = history ? (JSON.parse(history) as AccountHistory<HistoryItem>) : {};
    }
    return this._history;
  }

  public set history(value: AccountHistory<HistoryItem>) {
    this.accountStorage?.set(this.historyNamespace, JSON.stringify(value));
    this._history = { ...value };
  }

  public get historyList(): Array<HistoryItem> {
    return Object.values(this.history);
  }

  public getHistory(id: string): HistoryItem | null {
    return this.history[id] ?? null;
  }

  public getFilteredHistory(filterFn: (item: HistoryItem) => boolean): AccountHistory<HistoryItem> {
    const currentHistory = this.history;
    const filtered: AccountHistory<HistoryItem> = {};

    for (const id in currentHistory) {
      const item = currentHistory[id];
      if (filterFn(item)) {
        filtered[id] = item;
      }
    }

    return filtered;
  }

  public saveHistory(historyItem: HistoryItem, options?: SaveHistoryOptions): void {
    if (!historyItem?.id || (historyItem.type === undefined && (historyItem as any).status === 'error')) {
      return;
    }

    let historyCopy: AccountHistory<HistoryItem>;
    let addressStorage: Storage | undefined = undefined;

    const hasAccessToStorage = !!this.storage;
    const historyItemHasSigner = !!historyItem.from;
    // historyItem.from should appear here
    const historyItemFromAddress = historyItemHasSigner
      ? this.formatAddress(historyItem.from as string, false) // NOSONAR
      : '';
    const needToUpdateAddressStorage =
      !options?.toCurrentAccount &&
      historyItemFromAddress &&
      historyItemFromAddress !== this.address &&
      hasAccessToStorage;

    if (needToUpdateAddressStorage) {
      const { current, legacy } = deriveAddressNamespaces(historyItemFromAddress);
      addressStorage = new AccountStorage(current, legacy);
      const history = addressStorage.get(this.historyNamespace);
      historyCopy = history ? JSON.parse(history) : {};
    } else {
      historyCopy = { ...this.history };
    }

    const item = { ...(historyCopy[historyItem.id] || {}), ...historyItem };

    if (options?.wasNotGenerated) {
      // Tx was failed on the static validation and wasn't generated in the network
      delete item.txId;
    }

    historyCopy[historyItem.id] = item;

    if (needToUpdateAddressStorage && addressStorage) {
      addressStorage.set(this.historyNamespace, JSON.stringify(historyCopy));
    } else {
      this.history = historyCopy;
    }
  }

  public removeHistory(...ids: Array<string>): void {
    if (!ids.length) return;

    this.history = omit(ids, this.history);
  }

  /**
   * Remove all history
   * @param assetAddress If it's empty then all history will be removed, else - only history of the specific asset
   */
  public clearHistory(assetAddress?: string): void {
    if (assetAddress) {
      const filterFn = (item: HistoryItem) => ![item.assetAddress, item.asset2Address].includes(assetAddress);

      this.history = this.getFilteredHistory(filterFn);
    } else {
      this.history = {};
    }
  }

  public override logout(): void {
    super.logout();
    this.clearHistory();
  }
}

type RequiredHistoryParams = Required<Pick<HistoryItem, 'id' | 'type' | 'from'>>;

export class ApiAccount<T = void> extends WithAccountHistory implements ISubmitExtrinsic<T> {
  /** If `true` it'll be locked during extrinsics submit (`false` by default) */
  public shouldPairBeLocked = false;
  /** If `true` you might subscribe on extrinsic statuses (`false` by default) */
  public shouldObservableBeUsed = false;

  public get keyring(): Keyring {
    return keyring;
  }

  // prettier-ignore
  public async submitApiExtrinsic( // NOSONAR
    api: ApiPromise,
    extrinsic: SubmittableExtrinsic<'promise'>,
    accountPair: KeyringPair,
    signer?: Signer,
    historyData?: HistoryItem,
    unsigned = false,
  ): Promise<T> {
    // Signing the transaction
    const signedTx = await this.signExtrinsic(api, extrinsic, accountPair, signer, unsigned)
    // we should lock pair, if it's not locked
    this.shouldPairBeLocked && this.lockPair(accountPair);
    // history initial params
    const from = this.formatAddress(historyData?.from ?? accountPair?.address);
    const txId = signedTx.hash.toString();
    const id = historyData?.id ?? txId;
    const type = historyData?.type as Operation;
    const startTime = historyData?.startTime ?? Date.now();
    // history required params for each update
    const requiredParams: RequiredHistoryParams = { id, from ,type };

    if (historyData !== undefined) {
      this.saveHistory({ ...historyData, ...requiredParams, txId, startTime });
    }

    if (this.shouldObservableBeUsed) {
      return new Observable<ExtrinsicEvent>((subscriber) => {
        this.sendExtrinsic(extrinsic, requiredParams, subscriber);
      }) as unknown as T; // T is `Observable<ExtrinsicEvent>` here
    }

    return this.sendExtrinsic(extrinsic, requiredParams) as unknown as Promise<T>; // T is `void` here
  }

  public async submitExtrinsic(
    extrinsic: SubmittableExtrinsic<'promise'>,
    accountPair: KeyringPair,
    historyData?: HistoryItem,
    unsigned = false
  ): Promise<T> {
    return await this.submitApiExtrinsic(this.api, extrinsic, accountPair, this.signer, historyData, unsigned);
  }

  // apiAccount.ts

  public async signExtrinsic(
    api: ApiPromise,
    extrinsic: SubmittableExtrinsic<'promise'>,
    accountPair: KeyringPair,
    signer?: Signer,
    unsigned = false
  ) {
    if (unsigned) return extrinsic;

    const { account, options } = this.getAccountWithOptions(accountPair, signer);

    assert(account, Messages.connectWallet);

    const nonce = await api.rpc.system.accountNextIndex(accountPair.address);

    const signOptionsComplete = { ...options, nonce };

    return await extrinsic.signAsync(account, signOptionsComplete);
  }

  public async sendExtrinsic(
    extrinsic: SubmittableExtrinsic<'promise'>,
    requiredParams: RequiredHistoryParams,
    subscriber?: Subscriber<ExtrinsicEvent>
  ): Promise<void> {
    const { id, type } = requiredParams;

    const unsub = await extrinsic
      .send((result: ISubmittableResult) => {
        // Status cannot be null
        const status = first<string>(Object.keys(result.status.toJSON() as object))?.toLowerCase() as TransactionStatus;
        const updated: Partial<CombinedHistoryItem> = {};

        updated.status = status;

        if (result.status.isInBlock) {
          updated.blockId = result.status.asInBlock.toString();
        } else if (result.status.isFinalized) {
          updated.endTime = Date.now();

          const txIndex = result.txIndex;

          for (const {
            phase,
            event: { data, method, section },
          } of result.events) {
            if (!(phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === txIndex)) continue;

            if (method === 'FeeWithdrawn' && section === 'xorFee') {
              const [_, soraNetworkFee] = data;
              updated.soraNetworkFee = soraNetworkFee.toString();
            } else if (method === 'AssetRegistered' && section === 'assets') {
              const [assetId, _] = data;
              updated.assetAddress = ((assetId as CommonPrimitivesAssetId32Override).code ?? assetId).toString();
            } else if (
              method === 'Transfer' &&
              ['balances', 'tokens'].includes(section) &&
              isLiquidityPoolOperation(type)
            ) {
              // balances.Transfer doesn't have assetId field
              const [amount] = data.slice().reverse();
              const amountFormatted = new FPNumber(amount).toString();
              const history = this.getHistory(id as string);
              // events for 1st token and 2nd token are ordered in extrinsic
              const amountKey = history && 'amount' in history ? 'amount' : 'amount2';
              updated[amountKey] = amountFormatted;
            } else if (
              (method === 'RequestRegistered' && isEthOperation(type)) ||
              (method === 'RequestStatusUpdate' && (isEvmOperation(type) || isSubstrateOperation(type)))
            ) {
              updated.hash = first(data.toJSON() as any);
            } else if (method === 'CDPCreated' && section === 'kensetsu') {
              updated.vaultId = first(data.toJSON() as any);
            } else if (method === 'ExtrinsicFailed' && section === 'system') {
              updated.status = TransactionStatus.Error;
              updated.endTime = Date.now();

              const error = data[0] as any;
              if (error.isModule) {
                const decoded = this.api.registry.findMetaError(error.asModule);
                const { docs, section, name } = decoded;
                updated.errorMessage = section && name ? { name, section } : docs.join(' ').trim();
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                updated.errorMessage = error.toString();
              }
            }
          }
        }

        this.saveHistory({ ...requiredParams, ...updated }); // Save history during each status update
        // HistoryItem should appear here
        subscriber?.next([status, this.getHistory(id as string) as HistoryItem]); // NOSONAR

        if (result.status.isFinalized) {
          subscriber?.complete();
          unsub();
        }
      })
      .catch((e: Error) => {
        const errorParts = e?.message?.split(':');
        const errorInfo = last(errorParts)?.trim();
        const status = TransactionStatus.Error;
        const updated: Partial<CombinedHistoryItem> = {};

        updated.status = status;
        updated.endTime = Date.now();
        updated.errorMessage = errorInfo;

        // save history and then delete 'txId'
        this.saveHistory(
          { ...requiredParams, ...updated },
          {
            wasNotGenerated: true,
          }
        );
        // HistoryItem should appear here
        subscriber?.next([status, this.getHistory(id as string) as HistoryItem]); // NOSONAR
        subscriber?.complete();
        throw new Error(errorInfo);
      });
  }

  /**
   * Calc network fee for the extrinsic based on paymentInfo
   * @param extrinsic Extrinsic entity
   */
  public async getTransactionFee(extrinsic: SubmittableExtrinsic<'promise'>): Promise<CodecString> {
    try {
      const res = await extrinsic.paymentInfo(mockAccountAddress);

      return new FPNumber(res.partialFee, this.chainDecimals).toCodecString();
    } catch {
      // extrinsic is not supported in chain
      return '0';
    }
  }
}
