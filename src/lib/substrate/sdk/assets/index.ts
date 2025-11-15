import { assert, stringToU8a, u8aToHex, bnToU8a } from '@polkadot/util';
import { Subscription, Subject, combineLatest, map } from 'rxjs';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { CodecString, FPNumber, NumberLike } from '@sora-substrate/math';
import type { BalanceInfo } from '@sora-substrate/types';
import type { ApiPromise } from '@polkadot/api';
import type { Observable } from '@polkadot/types/types';
import type {
  OrmlTokensAccountData,
  PalletBalancesAccountData,
  CommonPrimitivesAssetId32,
} from '@polkadot/types/lookup';
import type { Option, u128 } from '@polkadot/types-codec';

import { DAY_IN_BLOCKS, KnownAssets, NativeAssets, XOR } from './consts';
import { DexId } from '../dex/consts';
import { PoolTokens } from '../poolXyk/consts';
import { Messages } from '../logger';
import { Operation, History } from '../types';
import type {
  AccountAsset,
  AccountBalance,
  Asset,
  Blacklist,
  TransferOptions,
  UnlockPeriodDays,
  Whitelist,
  WhitelistArrayItem,
  WhitelistIdsBySymbol,
  HistoryElementTransfer,
  VestedTransferHistory,
} from './types';
import type { Api } from '../api';

export function toAssetId(asset: CommonPrimitivesAssetId32) {
  return asset.code.toString();
}

/**
 * **For the external collaboration**
 *
 * Useful method for balance formatting
 *
 * @param data Account Data for ORML tokens or for PalletBalances
 * @param assetDecimals Asset decimals, 18 is used by default
 * @param bondedData Required only for XOR tokens in SORA network
 */
export function formatBalance(
  data: PalletBalancesAccountData | OrmlTokensAccountData,
  assetDecimals?: number,
  bondedData?: Option<u128>
): AccountBalance {
  const free = new FPNumber(data.free || 0, assetDecimals);
  const reserved = new FPNumber(data.reserved || 0, assetDecimals);
  // [Substrate 4: PalletBalancesAccountData]
  const miscFrozen = new FPNumber((data as PalletBalancesAccountData).miscFrozen || 0, assetDecimals);
  // [Substrate 4: PalletBalancesAccountData]
  const feeFrozen = new FPNumber((data as PalletBalancesAccountData).feeFrozen || 0, assetDecimals);
  const frozenDeprecated = miscFrozen.max(feeFrozen);
  // [Substrate 5: PalletBalancesAccountData] & OrmlTokensAccountData
  const frozenCurrent = new FPNumber((data as OrmlTokensAccountData).frozen || 0, assetDecimals);
  const frozen = frozenCurrent.max(frozenDeprecated);
  const transferable = free.sub(frozen);
  // [SORA] bondedData can be NaN, it can be checked by isEmpty===true
  const bonded = new FPNumber(!bondedData || bondedData.isEmpty ? 0 : bondedData, assetDecimals);
  // [SORA]
  const locked = reserved.add(frozen).add(bonded);

  return {
    free: free.toCodecString(),
    reserved: reserved.toCodecString(),
    frozen: frozen.toCodecString(),
    bonded: bonded.toCodecString(),
    locked: locked.toCodecString(),
    total: transferable.add(locked).toCodecString(),
    transferable: transferable.toCodecString(),
  };
}

async function getAssetInfo(api: ApiPromise, assetId: string): Promise<Asset> {
  const { symbol, name, precision, isMintable, assetType, contentSource, description } = (
    await api.query.assets.assetInfosV2({ code: assetId })
  ).toHuman() as any;

  return {
    address: assetId,
    symbol,
    name,
    decimals: +precision,
    isMintable: !!isMintable,
    type: assetType,
    content: contentSource,
    description,
  } as Asset;
}

/**
 * **For the external collaboration**
 *
 * Returns Asset Balance.
 *
 * If Asset ID == XOR, referrals.referrerBalances will be included as bonded
 *
 * @param api Polkadot based API object
 * @param accountAddress Account ID
 * @param assetAddress Asset ID
 * @param assetDecimals Asset decimals, 18 is used by default
 */
export async function getAssetBalance(
  api: ApiPromise,
  accountAddress: string,
  assetAddress: string,
  assetDecimals = 18
): Promise<AccountBalance> {
  if (assetAddress === XOR.address) {
    const [accountInfo, bondedBalance] = await Promise.all([
      api.query.system.account(accountAddress),
      api.query.referrals.referrerBalances(accountAddress),
    ]);
    return formatBalance(accountInfo.data, assetDecimals, bondedBalance);
  }
  const accountData = await api.query.tokens.accounts(accountAddress, assetAddress);
  return formatBalance(accountData, assetDecimals);
}

function isRegisteredAsset(asset: any, whitelist: Whitelist): boolean {
  if (!asset.address) {
    return false;
  }
  return !!whitelist[asset.address];
}

/**
 * Used *ONLY* for faucet
 */
export function getBalance(
  api: ApiPromise,
  accountAddress: string,
  assetAddress: string
): Promise<Option<BalanceInfo>> {
  return api.rpc.assets.usableBalance(accountAddress, assetAddress);
}

export function isNativeAsset(asset: any): boolean {
  if (!asset.address) {
    return false;
  }
  return !!NativeAssets.get(asset.address);
}

export function excludePoolXYKAssets(assets: Asset[]): Asset[] {
  return assets.filter((asset) => asset.symbol !== PoolTokens.XYKPOOL);
}

export function isBlacklistedAssetAddress(address: string, blacklist: Blacklist): boolean {
  return blacklist.includes(address);
}

export function getLegalAssets(allAssets: Array<Asset>, blacklist: Blacklist): Array<Asset> {
  if (!blacklist.length) return allAssets;

  return allAssets.filter(({ address }) => !isBlacklistedAssetAddress(address, blacklist));
}

const sort = (a: Asset, b: Asset, whitelist: Whitelist) => {
  const isNativeA = isNativeAsset(a);
  const isNativeB = isNativeAsset(b);
  const isRegisteredA = isRegisteredAsset(a, whitelist);
  const isRegisteredB = isRegisteredAsset(b, whitelist);
  if ((isNativeA && !isNativeB) || (isRegisteredA && !isRegisteredB)) {
    return -1;
  }
  if ((!isNativeA && isNativeB) || (!isRegisteredA && isRegisteredB)) {
    return 1;
  }
  if (a.symbol < b.symbol) {
    return -1;
  }
  if (a.symbol > b.symbol) {
    return 1;
  }
  return 0;
};

export async function getAssets(api: ApiPromise, whitelist?: Whitelist, blacklist?: Blacklist): Promise<Array<Asset>> {
  const allAssets = (await api.query.assets.assetInfosV2.entries()).map<Asset>(([key, codec]) => {
    const address = toAssetId(key.args[0]);

    const { symbol, name, precision, isMintable, assetType, contentSource, description } = codec.toHuman() as any;

    return {
      address,
      symbol,
      name,
      decimals: +precision,
      isMintable: !!isMintable,
      type: assetType,
      content: contentSource,
      description,
    };
  });

  const assets = blacklist?.length ? getLegalAssets(allAssets, blacklist) : allAssets;

  return !whitelist ? assets : assets.sort((a: Asset, b: Asset) => sort(a, b, whitelist));
}

export class AssetsModule<T> {
  constructor(private readonly root: Api<T>) {}

  /**
   * Get whitelist assets object
   * @param whitelist Whitelist array
   */
  getWhitelist(whitelist: Array<WhitelistArrayItem>): Whitelist {
    return whitelist.reduce<Whitelist>((acc, asset) => {
      const { address, name, symbol, decimals, icon } = asset;
      acc[address] = { name, symbol, decimals, icon };
      return acc;
    }, {});
  }

  /**
   * Check is whitelisted asset or not
   * @param asset Asset object
   * @param whitelist Whitelist assets object
   */
  isWhitelist(asset: Partial<Asset>, whitelist: Whitelist): boolean {
    return isRegisteredAsset(asset, whitelist);
  }

  /**
   * Get whitelist object by symbol as keys
   * @param whitelist Whitelist array
   */
  getWhitelistIdsBySymbol(whitelist: Array<WhitelistArrayItem>) {
    return whitelist.reduce<WhitelistIdsBySymbol>((acc, asset) => {
      const { address, symbol } = asset;
      acc[symbol.toUpperCase()] = address;
      return acc;
    }, {});
  }

  /**
   * Check is blacklisted asset or not
   * @param asset Asset object
   * @param whitelistIdsBySymbol whitelist object by symbol as keys
   */
  isBlacklist(asset: Partial<Asset>, whitelistIdsBySymbol: WhitelistIdsBySymbol): boolean {
    const { address, symbol } = asset;
    if (!(address && symbol)) {
      return false;
    }
    const foundAddress = whitelistIdsBySymbol[symbol];
    if (!foundAddress) {
      return false;
    }
    return foundAddress !== address;
  }

  /**
   * Checks if asset is NFT or not.
   *
   * **Asset is NFT if it has content and description fields**
   * @param asset
   */
  isNft(asset: Asset | AccountAsset): boolean {
    return !!(asset.content && asset.description);
  }

  /**
   * Checks if NFT asset is blacklisted or not.
   * @param asset Asset object
   * @param blacklist Blacklist assets object
   */
  isNftBlacklisted(asset: Partial<Asset>, blacklist: Blacklist): boolean {
    if (!asset.address) {
      return false;
    }

    return blacklist.includes(asset.address);
  }

  // Default assets addresses of account - list of NativeAssets addresses
  public accountDefaultAssetsAddresses: Array<string> = NativeAssets.map((asset) => asset.address);

  private _accountAssetsAddresses: Array<string> = [];
  private balanceSubscriptions: Map<string, Subscription> = new Map();
  private balanceSubject = new Subject<void>();
  public balanceUpdated = this.balanceSubject.asObservable();
  public accountAssets: Array<AccountAsset> = [];

  // # Account assets methods

  private subscribeToAssetBalance(asset: AccountAsset): void {
    const subscription = this.getAssetBalanceObservable(asset).subscribe((accountBalance: AccountBalance) => {
      asset.balance = accountBalance;
      this.balanceSubject.next();
    });
    this.balanceSubscriptions.set(asset.address, subscription);
  }

  private unsubscribeFromAssetBalance(address: string): void {
    this.balanceSubscriptions.get(address)?.unsubscribe();
    this.balanceSubscriptions.delete(address);
  }

  private async addToAccountAssetsList(address: string): Promise<void> {
    if (this.getAsset(address)) return;
    // Get asset data and balance info
    const asset = await this.getAccountAsset(address);
    // During async execution of the method above, asset may have already been added
    // Check again, that asset is not in account assets list
    if (!this.getAsset(address)) {
      this.accountAssets.push(asset);
      this.subscribeToAssetBalance(asset);
    }
  }

  private removeFromAccountAssets(address: string): void {
    this.accountAssets = this.accountAssets.filter((item) => item.address !== address);
  }

  private removeFromAccountAssetsList(address: string): void {
    this.unsubscribeFromAssetBalance(address);
    this.removeFromAccountAssets(address);
    this.balanceSubject.next();
  }

  /**
   * Add account asset to the end of list & create balance subscription
   * @param address asset address
   */
  public async addAccountAsset(address: string): Promise<void> {
    this.addToAccountAssetsAddressesList(address);
    await this.addToAccountAssetsList(address);
  }

  /**
   * Remove account asset & it's balance subscription
   * @param address asset address
   */
  public removeAccountAsset(address: string): void {
    this.removeFromAccountAssetsAddressesList(address);
    this.removeFromAccountAssetsList(address);
  }

  /**
   * Clear account assets & their balance subscriptions
   */
  public clearAccountAssets() {
    for (const address of this.balanceSubscriptions.keys()) {
      this.unsubscribeFromAssetBalance(address);
    }
    this.accountAssets = [];
  }

  /**
   * Find account asset in account assets list
   * @param address asset address
   */
  public getAsset(address: string): AccountAsset | null {
    return this.accountAssets.find((asset) => asset.address === address) ?? null;
  }

  public getAssetBalanceObservable(asset: AccountAsset | Asset): Observable<AccountBalance> {
    const accountAddress = this.root.account?.pair.address;
    assert(accountAddress, Messages.connectWallet);
    const assetAddress = asset.address;
    if (assetAddress === XOR.address) {
      const accountInfo = this.root.apiRx.query.system.account(accountAddress);
      const bondedBalance = this.root.apiRx.query.referrals.referrerBalances(accountAddress);

      return combineLatest([accountInfo, bondedBalance]).pipe(
        map((result) => formatBalance(result[0].data, asset.decimals, result[1]))
      );
    }
    return this.root.apiRx.query.tokens
      .accounts(accountAddress, assetAddress)
      .pipe(map((accountData) => formatBalance(accountData, asset.decimals)));
  }

  /**
   * Get total XOR balance including staking
   * and liquidity poolings
   *
   */
  public getTotalXorBalanceObservable(): Observable<FPNumber> {
    return combineLatest([
      this.getAssetBalanceObservable(XOR),
      this.root.demeterFarming.getAccountPoolsObservable(),
    ]).pipe(
      map(([xorAssetBalance, demeterFarmingPools]) => {
        // wallet xor balance (including frozen & bonded)
        const xorBalanceTotal = FPNumber.fromCodecValue(xorAssetBalance.total);

        // staked xor in demeter farming platform
        const xorStaked = demeterFarmingPools
          .filter((pool) => pool.isFarm === false && pool.poolAsset === XOR.address)
          .map((pool) => pool.pooledTokens);
        const xorStakedTotal = xorStaked.reduce((prev, curr) => prev.add(curr), FPNumber.ZERO);

        // pooled xor
        const xorPooled = this.root.poolXyk.accountLiquidity
          .filter((pool) => pool.firstAddress === XOR.address || pool.secondAddress === XOR.address)
          .map((pool) => (pool.firstAddress === XOR.address ? pool.firstBalance : pool.secondBalance))
          .map((pooledXor) => FPNumber.fromCodecValue(pooledXor));
        const xorPooledTotal = xorPooled.reduce((prev, curr) => prev.add(curr), FPNumber.ZERO);

        return xorBalanceTotal.add(xorStakedTotal).add(xorPooledTotal);
      })
    );
  }

  /**
   * Sync account assets with account assets address list
   * During update process, assets should be removed according to 'excludedAddresses'
   * and exists in accounts assets list according to 'currentAddresses'
   */
  public async updateAccountAssets(): Promise<void> {
    assert(this.root.account, Messages.connectWallet);

    if (!this.accountAssetsAddresses.length) {
      const defaultList = this.accountDefaultAssetsAddresses;
      const accountList = await this.getAccountTokensAddressesList();
      this.accountAssetsAddresses = [...new Set([...defaultList, ...accountList])];
    }

    const currentAddresses = this.accountAssetsAddresses;
    const excludedAddresses = this.accountAssets.reduce<string[]>(
      (result, { address }) => (currentAddresses.includes(address) ? result : [...result, address]),
      []
    );

    for (const assetAddress of excludedAddresses) {
      this.removeFromAccountAssetsList(assetAddress);
    }

    if (!currentAddresses.length) return;

    const addToAccountAssetsListPromises = currentAddresses.map((assetId) => this.addToAccountAssetsList(assetId));
    await Promise.allSettled(addToAccountAssetsListPromises);
    // sort assets by currentAddresses list
    this.accountAssets.sort((a, b) => {
      return currentAddresses.indexOf(a.address) - currentAddresses.indexOf(b.address);
    });
  }

  /**
   * Get asset information
   * @param address asset address
   */
  public async getAssetInfo(address: string): Promise<Asset> {
    const knownAsset = KnownAssets.get(address);
    if (knownAsset) {
      return knownAsset;
    }
    const existingAsset =
      this.getAsset(address) ?? this.root.poolXyk.accountLiquidity.find((asset) => asset.address === address);
    if (existingAsset) {
      return {
        address: existingAsset.address,
        decimals: existingAsset.decimals,
        symbol: existingAsset.symbol,
        name: existingAsset.name,
        // will be empty if coming from pookXyk
        type: (existingAsset as AccountAsset).type,
        content: (existingAsset as AccountAsset).content,
        description: (existingAsset as AccountAsset).description,
      } as Asset;
    }
    return await getAssetInfo(this.root.api, address);
  }

  /**
   * Get account asset information.
   * You can just check balance of any asset
   * @param address asset address
   */
  public async getAccountAsset(address: string, accountAddress?: string): Promise<AccountAsset> {
    assert(this.root.account, Messages.connectWallet);
    const targetAddress = accountAddress || this.root.account.pair.address;
    const { decimals, symbol, name, type, content, description } = await this.getAssetInfo(address);
    const asset = { address, decimals, symbol, name, type, content, description } as AccountAsset;
    const result = await getAssetBalance(this.root.api, targetAddress, address, decimals);
    asset.balance = result;

    return asset;
  }

  /**
   * Get account ORML tokens list with any non zero balance
   * @param account Account ID
   * @returns Array of asset addresses
   */
  public async getTokensAddressesList(account: string): Promise<string[]> {
    const data = await this.root.api.query.tokens.accounts.entries(account);
    const list: string[] = [];

    for (const [key, { free, reserved, frozen }] of data) {
      const assetId = toAssetId(key.args[1]);
      const hasAssetAnyBalance = [free, reserved, frozen].some((value) => !new FPNumber(value).isZero());

      if (hasAssetAnyBalance) {
        list.push(assetId);
      }
    }

    return list;
  }

  /**
   * Get account ORML tokens list with any non zero balance
   */
  public async getAccountTokensAddressesList(): Promise<string[]> {
    assert(this.root.account, Messages.connectWallet);
    return this.getTokensAddressesList(this.root.account.pair.address);
  }

  // # Account assets addresses

  public get accountAssetsAddresses(): Array<string> {
    if (this.root.accountStorage) {
      const addresses = this.root.accountStorage.get('assetsAddresses');
      this._accountAssetsAddresses = addresses ? (JSON.parse(addresses) as Array<string>) : [];
    }
    return this._accountAssetsAddresses;
  }

  public set accountAssetsAddresses(assetsAddresses: Array<string>) {
    this.root.accountStorage?.set('assetsAddresses', JSON.stringify(assetsAddresses));
    this._accountAssetsAddresses = [...assetsAddresses];
  }

  private addToAccountAssetsAddressesList(assetAddress: string): void {
    if (this.accountAssetsAddresses.includes(assetAddress)) return;
    // add address to the end of list
    this.accountAssetsAddresses = [...this.accountAssetsAddresses, assetAddress];
  }

  private removeFromAccountAssetsAddressesList(address: string): void {
    this.accountAssetsAddresses = this.accountAssetsAddresses.filter((item) => item !== address);
  }

  /**
   * Get all tokens list registered in the blockchain network
   * @param withPoolTokens `false` by default
   * @param whitelist set of whitelist tokens
   * @param blacklist set of blacklist tokens
   */
  public async getAssets(withPoolTokens = false, whitelist?: Whitelist, blacklist?: Blacklist): Promise<Array<Asset>> {
    const assets = await getAssets(this.root.api, whitelist, blacklist);

    return withPoolTokens ? assets : excludePoolXYKAssets(assets);
  }

  /**
   * Get all tokens addresses list registered in the blockchain network
   * @param blacklist set of blacklist tokens
   */
  public async getAssetsIds(blacklist?: Blacklist): Promise<string[]> {
    const ids = (await this.root.api.rpc.assets.listAssetIds()).map((codec) => codec.toString());
    const filtered = blacklist?.length ? ids.filter((id) => !isBlacklistedAssetAddress(id, blacklist)) : ids;

    return filtered;
  }

  /**
   * Get asset IDs of the asset owner (creator).
   *
   * @param account Account ID of the asset owner. If not set - the selected account ID is used.
   */
  public async getOwnedAssetIds(account?: string): Promise<Array<string>> {
    const accountId = account ?? this.root.account?.pair.address;
    assert(accountId, Messages.connectWallet);
    try {
      const assets = await this.root.api.query.assets.assetOwners.entries();

      return assets.reduce<Array<string>>((buffer, item) => {
        const accountIdItem = item[1].unwrapOr('').toString();
        if (!accountIdItem || accountIdItem !== accountId) {
          return buffer;
        }
        const newAsset: string = toAssetId(item[0].args[0]);
        if (!newAsset) {
          return buffer;
        }
        return [...buffer, newAsset];
      }, []);
    } catch {
      return [];
    }
  }

  public subscribeOnAssetTransferableBalance(assetId: string, accountId: string): Observable<string> {
    const observable =
      assetId === XOR.address
        ? this.root.apiRx.query.system.account(accountId).pipe(map((info) => formatBalance(info.data)))
        : this.root.apiRx.query.tokens.accounts(accountId, assetId).pipe(map((info) => formatBalance(info)));

    return observable.pipe(map((accountBalance) => accountBalance.transferable));
  }

  public subscribeOnAssetSupply(assetId: string): Observable<CodecString> {
    let rxQuery: () => Observable<u128>;
    if (assetId === XOR.address) {
      rxQuery = this.root.apiRx.query.balances.totalIssuance;
    } else {
      rxQuery = () => this.root.apiRx.query.tokens.totalIssuance(assetId);
    }
    return rxQuery().pipe(map((res) => res.toString()));
  }

  public async getAssetSupply(assetId: string): Promise<CodecString> {
    let query: () => Promise<u128>;
    if (assetId === XOR.address) {
      query = this.root.api.query.balances.totalIssuance;
    } else {
      query = () => this.root.api.query.tokens.totalIssuance(assetId);
    }
    const supply = await query();
    return supply.toString();
  }

  /**
   * Get next asset ID after registering for the selected account.
   *
   * This method is used for the asset ID generation.
   *
   * @see https://github.com/sora-xor/sora2-network/blob/3f35601d27a145d5398b8c6a96306de83c58f33b/pallets/assets/src/lib.rs#L678
   */
  public async getNextRegisteredAssetId(): Promise<string> {
    assert(this.root.account, Messages.connectWallet);
    const account = this.root.account.pair.publicKey;

    const title = stringToU8a('Sora Asset Id');

    const index = await this.root.api.rpc.system.accountNextIndex(account);
    const nonce = bnToU8a(index.toBn().addn(1), { bitLength: 32 });

    const output = keccak256AsU8a(new Uint8Array([...title, ...account, ...nonce]));
    output[0] = 0;

    return u8aToHex(output);
  }

  /**
   * Register asset
   * @param symbol string with asset symbol
   * @param name string with asset name
   * @param totalSupply total token supply
   * @param extensibleSupply `true` means that token can be mintable any time by the owner of that token. `false` by default
   * @param nonDivisible `false` by default
   * @param nft Nft params object which contains content & description
   * @param nft.content Nft content string
   * @param nft.description Nft description string
   */
  public register(
    symbol: string,
    name: string,
    totalSupply: NumberLike,
    extensibleSupply = false,
    nonDivisible = false,
    nft: { content: string | null; description: string | null } = {
      content: null,
      description: null,
    }
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const supply = new FPNumber(totalSupply, nonDivisible ? 0 : FPNumber.DEFAULT_PRECISION);
    const args = [symbol, name, supply.toCodecString(), extensibleSupply, nonDivisible, nft.content, nft.description];

    const historyItem: History = {
      symbol,
      type: Operation.RegisterAsset,
    };

    return this.root.submitExtrinsic(
      (this.root.api.tx.assets.register as any)(...args),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * **DEPRECATED** use `transfer` instead
   *
   * Transfer amount from account
   * @param asset Asset object
   * @param toAddress Account address
   * @param amount Amount value
   * @deprecated
   */
  public simpleTransfer(asset: Asset | AccountAsset, toAddress: string, amount: NumberLike): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const assetAddress = asset.address;
    const formattedToAddress = toAddress.startsWith('cn') ? toAddress : this.root.formatAddress(toAddress);

    const historyItem: History = {
      type: Operation.Transfer,
      symbol: asset.symbol,
      to: formattedToAddress,
      amount: `${amount}`,
      assetAddress,
    };

    return this.root.submitExtrinsic(
      this.root.api.tx.assets.transfer(assetAddress, toAddress, new FPNumber(amount, asset.decimals).toCodecString()),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Transfer amount from account
   * @param asset Asset object
   * @param toAddress Account address
   * @param amount Amount value
   * @param {TransferOptions} options Options object which includes:
   * @param options.comment Comment field (max length: 128 symbols)
   * @param options.feeType Use 'xor' for now
   */
  public transfer(
    asset: Asset | AccountAsset,
    toAddress: string,
    amount: NumberLike,
    options: TransferOptions = { feeType: 'xor' }
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    assert(options.comment?.length ?? 0 <= 128, Messages.commentFieldIsTooLong);
    const assetAddress = asset.address;
    const { comment, feeType, assetFee } = options;
    const commentStr = comment ?? null;
    const assetFeeParam = assetFee ?? 0;
    const formattedToAddress = toAddress.startsWith('cn') ? toAddress : this.root.formatAddress(toAddress);
    const desiredXorAmount = feeType === 'xor' ? 0 : assetFeeParam; // Set it later to have real XOR less transfers
    const maxAmountIn = feeType === 'xor' ? 0 : assetFeeParam; // Set it later to have real XOR less transfers

    const historyItem: HistoryElementTransfer = {
      symbol: asset.symbol,
      to: formattedToAddress,
      amount: `${amount}`,
      assetAddress,
      type: Operation.XorlessTransfer,
      comment,
    };

    return this.root.submitExtrinsic(
      this.root.api.tx.liquidityProxy.xorlessTransfer(
        DexId.XOR,
        assetAddress,
        toAddress,
        new FPNumber(amount, asset.decimals).toCodecString(),
        desiredXorAmount,
        maxAmountIn,
        [],
        'Disabled',
        commentStr
      ),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Mint tokens for the selected account. Mint can be signed **only** by token creator.
   * Also, the selected token should have extensible supply.
   * @param asset Asset object
   * @param amount Amount value
   * @param toAddress Account address who will receive minted tokens. If not set - signer account ID will be used
   */
  public mint(asset: Asset | AccountAsset, amount: NumberLike, toAddress?: string): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const assetAddress = asset.address;
    const address = toAddress || this.root.account.pair.address;
    const formattedAddress = address.startsWith('cn') ? address : this.root.formatAddress(address);
    const historyItem: History = {
      type: Operation.Mint,
      to: formattedAddress,
      amount: `${amount}`,
      assetAddress,
      symbol: asset.symbol,
    };

    return this.root.submitExtrinsic(
      this.root.api.tx.assets.mint(assetAddress, address, new FPNumber(amount, asset.decimals).toCodecString()),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Burn tokens you own.
   * @param asset Asset object
   * @param amount Amount value
   */
  public burn(asset: Asset | AccountAsset, amount: NumberLike): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const assetAddress = asset.address;
    const historyItem: History = {
      type: Operation.Burn,
      amount: `${amount}`,
      assetAddress,
      symbol: asset.symbol,
    };

    return this.root.submitExtrinsic(
      this.root.api.tx.assets.burn(assetAddress, new FPNumber(amount, asset.decimals).toCodecString()),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Get vesting schedule for VestedTransfer feature
   * @param asset Asset object
   * @param amount Amount value
   * @param startBlockNumber Block number (from the blockchain) when the unlock period starts
   * @param vestingPercent Vesting percent value (0-100)
   * @param unlockPeriodInDays Unlock period in days (1, 7, 30, 60, 90)
   */
  private getVestingSchedule(
    asset: Asset | AccountAsset,
    amount: NumberLike,
    startBlockNumber: number,
    vestingPercent: number,
    unlockPeriodInDays: UnlockPeriodDays
  ) {
    const percent = vestingPercent / 100;
    const periodInBlocks = unlockPeriodInDays * DAY_IN_BLOCKS;
    const amountFp = new FPNumber(amount, asset.decimals ?? FPNumber.DEFAULT_PRECISION);
    const perPeriod = amountFp.mul(percent); // amount * percent
    const div = amountFp.div(perPeriod);
    const remainderAmount = amountFp.mod(perPeriod);
    const periodCount = (remainderAmount.isZero() ? div : div.add(1)).toNumber(0); // if there is a remainder, add 1 period

    return {
      LinearVestingSchedule: {
        start: startBlockNumber,
        assetId: asset.address,
        period: periodInBlocks,
        periodCount,
        perPeriod: perPeriod.toCodecString(),
        remainderAmount: remainderAmount.toCodecString(),
      },
    };
  }

  /**
   * Vested transfer of tokens for the selected account.
   * @param asset Asset object
   * @param toAddress Account address who will receive tokens
   * @param amount Amount value
   * @param startBlockNumber Block number (from the blockchain) when the unlock period starts
   * @param vestingPercent Vesting percent value (0-100)
   * @param unlockPeriodInDays Unlock period in days (1, 7, 30, 60, 90)
   */
  public vestedTransfer(
    asset: Asset | AccountAsset,
    toAddress: string,
    amount: NumberLike,
    startBlockNumber: number,
    vestingPercent: number,
    unlockPeriodInDays: UnlockPeriodDays
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    const assetAddress = asset.address;
    const schedule = this.getVestingSchedule(asset, amount, startBlockNumber, vestingPercent, unlockPeriodInDays);
    const historyItem: VestedTransferHistory = {
      type: Operation.VestedTransfer,
      amount: `${amount}`,
      assetAddress,
      symbol: asset.symbol,
      to: toAddress,
      period: schedule.LinearVestingSchedule.period,
      percent: vestingPercent,
      start: startBlockNumber,
    };

    return this.root.submitExtrinsic(
      this.root.api.tx.vestedRewards.vestedTransfer(toAddress, schedule),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Get vested transfer network fee for the selected account.
   *
   * The fee is calculated based on the vesting schedule so it cannot be calculated using the static data.
   * @param asset Asset object
   * @param amount Amount value
   * @param startBlockNumber Block number (from the blockchain) when the unlock period starts
   * @param vestingPercent Vesting percent value (0-100)
   * @param unlockPeriodInDays Unlock period in days (1, 7, 30, 60, 90)
   */
  public async getVestedTransferFee(
    asset: Asset | AccountAsset,
    amount: NumberLike,
    startBlockNumber: number,
    vestingPercent: number,
    unlockPeriodInDays: UnlockPeriodDays
  ): Promise<FPNumber> {
    const schedule = this.getVestingSchedule(asset, amount, startBlockNumber, vestingPercent, unlockPeriodInDays);

    const fee = await this.root.getTransactionFee(this.root.api.tx.vestedRewards.vestedTransfer('', schedule));

    return FPNumber.fromCodecValue(fee);
  }
}
