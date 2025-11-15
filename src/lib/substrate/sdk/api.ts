import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@sora-substrate/api';
import { FPNumber, type CodecString, type NumberLike } from '@sora-substrate/math';
import { Connection } from '@sora-substrate/connection';
import type { CreateResult } from '@polkadot/ui-keyring/types';
import type { Signer } from '@polkadot/types/types';

import { BaseApi } from './BaseApi';
import { BridgeProxyModule } from './bridgeProxy';
import { SwapModule } from './swap';
import { RewardsModule } from './rewards';
import { PoolXykModule } from './poolXyk';
import { ReferralSystemModule } from './referralSystem';
import { AssetsModule } from './assets';
import { ExtendedAssetsModule } from './extendedAssets';
import { PrestoModule } from './presto';
import { OrderBookModule } from './orderBook';
import { MstModule } from './mst';
import { SystemModule } from './system';
import { StakingModule } from './staking';
import { DemeterFarmingModule } from './demeterFarming';
import { DexModule } from './dex';
import { CeresLiquidityLockerModule } from './ceresLiquidityLocker';
import { KensetsuModule } from './kensetsu';
import { CryptoModule } from './crypto';
import { XOR } from './assets/consts';
import type { Storage } from './storage';
import type { AccountAsset, Asset } from './assets/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types/submittable';
import { KeyringPair } from '@polkadot/keyring/types';
import { HistoryItem } from './types';

/**
 * Contains all necessary data and functions for the wallet & polkaswap client
 */
export class Api<T = void> extends BaseApi<T> {
  public readonly defaultSlippageTolerancePercent = 0.5;

  public readonly bridgeProxy = new BridgeProxyModule<T>(this);

  public readonly swap = new SwapModule<T>(this);
  public readonly rewards = new RewardsModule<T>(this);
  public readonly poolXyk = new PoolXykModule<T>(this);
  public readonly referralSystem = new ReferralSystemModule<T>(this);
  public readonly assets = new AssetsModule<T>(this);
  public readonly extendedAssets = new ExtendedAssetsModule<T>(this);
  public readonly presto = new PrestoModule<T>(this);
  public readonly orderBook = new OrderBookModule<T>(this);
  public readonly crypto = new CryptoModule();
  /** This module is used for internal needs */
  public readonly mst = new MstModule<T>(this);
  public readonly system = new SystemModule<T>(this);
  public readonly staking = new StakingModule<T>(this);
  public readonly demeterFarming = new DemeterFarmingModule<T>(this);
  public readonly dex = new DexModule<T>(this);
  public readonly ceresLiquidityLocker = new CeresLiquidityLockerModule<T>(this);
  public readonly kensetsu = new KensetsuModule<T>(this);

  public override setConnection(connection: Connection) {
    super.setConnection(connection);
    this.bridgeProxy.setConnection(connection);
  }

  public override initAccountStorage() {
    super.initAccountStorage();
    this.bridgeProxy.initAccountStorage();
  }

  /**
   * Set storage if it should be used as data storage
   * @param storage
   */
  public override setStorage(storage: Storage): void {
    super.setStorage(storage);
    this.bridgeProxy.setStorage(storage);
  }

  // # Account management methods

  /**
   * Set signer if the pair is locked (For polkadot js extension usage)
   * @param signer
   */
  public override setSigner(signer: Signer): void {
    super.setSigner(signer);
    this.bridgeProxy.setSigner(signer);
  }

  public async restoreActiveAccount(): Promise<void> {
    const address = this.storage?.get('address');

    if (address) {
      const defaultAddress = this.formatAddress(address, false);
      const name = this.storage?.get('name');
      const source = this.storage?.get('source');
      const isExternalFlag = this.storage?.get('isExternal');
      const isExternal = isExternalFlag ? JSON.parse(isExternalFlag) : null;
      const isExternalAccount = isExternal || (isExternal === null && !!source);

      await this.loginAccount(defaultAddress, name, source, isExternalAccount);
    }
  }

  /**
   * The first method you should run. Includes initialization process
   * @param withKeyringLoading `true` by default
   */
  public async initialize(withKeyringLoading = true): Promise<void> {
    if (withKeyringLoading) {
      await this.initKeyring();
      await this.restoreActiveAccount();
    }

    // Update dex data
    await Promise.allSettled([this.dex.update(), this.swap.update()]);
  }

  public override setAccount(account: CreateResult, name?: string, source?: string, isExternal?: boolean): void {
    super.setAccount(account);
    this.bridgeProxy.setAccount(account);

    if (this.storage) {
      const soraAddress = this.formatAddress(account.pair.address);

      this.storage.set('address', soraAddress);
      // Optional params are just for External clients for now
      name && this.storage.set('name', name);
      source && this.storage.set('source', source);
      typeof isExternal === 'boolean' && this.storage.set('isExternal', isExternal);
    }
  }

  /**
   * Change the account name
   * TODO: check it, polkadot-js extension doesn't change account name
   * @param address account address
   * @param name New name
   */
  public override changeAccountName(address: string, name: string): void {
    super.changeAccountName(address, name);

    if (this.storage && this.accountPair && this.formatAddress(address, false) === this.accountPair.address) {
      this.storage.set('name', name);
    }
  }

  /**
   * Remove all wallet data
   */
  public override logout(): void {
    this.assets.clearAccountAssets();
    this.poolXyk.clearAccountLiquidity();

    super.logout();
    this.bridgeProxy.logout();
  }

  public override async submitExtrinsic(
    extrinsic: SubmittableExtrinsic<'promise'>,
    accountPair: KeyringPair,
    historyData?: HistoryItem,
    unsigned?: boolean
  ): Promise<T> {
    const isMultisig = api.mst.getMstAccount(accountPair.address) !== undefined;

    if (isMultisig) {
      let mainAccountPair: KeyringPair | null = null;
      if (this.accountStorage?.get('previousAccountAddress')) {
        console.info('this.accountStorage?.get previousAccountAddress exists');
        const previousAccountAddress = this.accountStorage?.get('previousAccountAddress');
        mainAccountPair = this.keyring.getPair(previousAccountAddress);
      } else {
        mainAccountPair = this.previousAccount?.pair ?? null;
      }

      if (!historyData) {
        throw new Error('historyData is required for multisig transactions');
      }
      if (!mainAccountPair) {
        throw new Error('Main account keyring pair not found');
      }
      return (await this.mst.submitMultisigExtrinsic(
        extrinsic,
        accountPair, // Multisig account pair
        mainAccountPair, // Main account pair for signing
        historyData,
        unsigned
      )) as unknown as Promise<T>;
    } else {
      return await super.submitExtrinsic(extrinsic, accountPair, historyData, unsigned);
    }
  }

  public hasEnoughXor(asset: AccountAsset, amount: string | number, fee: FPNumber | CodecString): boolean {
    const xorDecimals = XOR.decimals;
    const fpFee = fee instanceof FPNumber ? fee : FPNumber.fromCodecValue(fee, xorDecimals);
    if (asset.address === XOR.address) {
      const fpBalance = FPNumber.fromCodecValue(asset.balance.transferable, xorDecimals);
      const fpAmount = new FPNumber(amount, xorDecimals);
      return FPNumber.lte(fpFee, fpBalance.sub(fpAmount));
    }
    // Here we should be sure that xor value of account was tracked & updated
    const xorAccountAsset = this.assets.getAsset(XOR.address);
    if (!xorAccountAsset) {
      return false;
    }
    const xorBalance = FPNumber.fromCodecValue(xorAccountAsset.balance.transferable, xorDecimals);
    return FPNumber.lte(fpFee, xorBalance);
  }

  private divideAssetsInternal(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    reversed: boolean
  ): string {
    const decimals = Math.max(firstAsset.decimals, secondAsset.decimals);
    const one = new FPNumber(1, decimals);
    const firstAmountNum = new FPNumber(firstAmount, decimals);
    const secondAmountNum = new FPNumber(secondAmount, decimals);
    const nonReversedSecond = !secondAmountNum.isZero() ? secondAmountNum : one;
    const reversedSecond = !firstAmountNum.isZero() ? firstAmountNum : one;
    const result = !reversed ? firstAmountNum.div(nonReversedSecond) : secondAmountNum.div(reversedSecond);
    return result.format();
  }

  /**
   * Divide the first asset by the second
   * @param firstAsset
   * @param secondAsset
   * @param firstAmount
   * @param secondAmount
   * @param reversed If `true`: the second by the first (`false` by default)
   * @returns Formatted string
   */
  public divideAssets(
    firstAsset: Asset | AccountAsset,
    secondAsset: Asset | AccountAsset,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    reversed = false
  ): string {
    return this.divideAssetsInternal(firstAsset, secondAsset, firstAmount, secondAmount, reversed);
  }

  /**
   * Divide the first asset by the second
   * @param firstAssetAddress
   * @param secondAssetAddress
   * @param firstAmount
   * @param secondAmount
   * @param reversed If `true`: the second by the first (`false` by default)
   * @returns Promise with formatted string
   */
  public async divideAssetsByAssetIds(
    firstAssetAddress: string,
    secondAssetAddress: string,
    firstAmount: NumberLike,
    secondAmount: NumberLike,
    reversed = false
  ): Promise<string> {
    const firstAsset = await this.assets.getAssetInfo(firstAssetAddress);
    const secondAsset = await this.assets.getAssetInfo(secondAssetAddress);
    return this.divideAssetsInternal(firstAsset, secondAsset, firstAmount, secondAmount, reversed);
  }
}

/**
 * Base SORA connection object (without cache by default)
 */
export const connection = new Connection(ApiPromise, WsProvider, options());

/** Api object */
const api = new Api();
// inject connection to api
api.setConnection(connection);

export { api };
