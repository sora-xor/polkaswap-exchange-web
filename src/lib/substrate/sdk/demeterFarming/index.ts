import { map, combineLatest } from 'rxjs';
import { assert } from '@polkadot/util';
import { FPNumber } from '@sora-substrate/math';
import type { Observable } from '@polkadot/types/types';
import type { StorageKey } from '@polkadot/types';
import type { CommonPrimitivesAssetId32 } from '@polkadot/types/lookup';
import type { NumberLike } from '@sora-substrate/math';

import { toAssetId } from '../assets';
import { Messages } from '../logger';
import { Operation } from '../types';
import { XOR } from '../assets/consts';

import type { Api } from '../api';
import type { AccountAsset, Asset } from '../assets/types';
import type { DemeterPool, DemeterRewardToken, DemeterAccountPool } from './types';

export class DemeterFarmingModule<T> {
  constructor(private readonly root: Api<T>) {}

  /**
   * Get a list of pools for farming & staking, by provided pool & reward asset adresses
   * @param poolAsset address of pool asset (paired with XOR)
   * @param rewardAsset address of reward asset
   * @returns Observable list of pools
   */
  public getPoolsByAssetsObservable(poolAsset: string, rewardAsset: string): Observable<DemeterPool[]> {
    return this.root.apiRx.query.demeterFarmingPlatform.pools(poolAsset, rewardAsset).pipe(
      map((poolDataVec) => {
        return poolDataVec.map((poolData) => ({
          baseAsset: toAssetId(poolData.baseAsset),
          poolAsset,
          rewardAsset,
          multiplier: poolData.multiplier.toNumber(),
          isCore: poolData.isCore.isTrue,
          isFarm: poolData.isFarm.isTrue,
          isRemoved: poolData.isRemoved.isTrue,
          depositFee: new FPNumber(poolData.depositFee).toNumber(),
          totalTokensInPool: new FPNumber(poolData.totalTokensInPool),
          rewards: new FPNumber(poolData.rewards),
          rewardsToBeDistributed: new FPNumber(poolData.rewardsToBeDistributed),
        }));
      })
    );
  }

  /**
   * Get a list of all pools for farming and staking
   * @returns Observable list of pools
   */
  public async getPoolsObservable(): Promise<Observable<DemeterPool[]> | null> {
    // According to this type
    // @polkadot/api-base/types/storage.ts
    // keys: <K extends AnyTuple = A>(...args: DropLast<Parameters<F>>) => PromiseOrObs<ApiType, StorageKey<K>[]>;
    // entries, keys and keyPrefix methods should have the same params DoubleMap has minus last parameter.
    // But it's technically possible to use these methods without params.
    // Polkadot has done it mostly to avoid performance-based issues so we need to ignore that
    const storageKeys: StorageKey<[CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]>[] = await (
      this.root.api.query.demeterFarmingPlatform.pools.keys as any
    )();

    if (!storageKeys.length) return null;

    const keys = storageKeys.map((item) => {
      const [poolAssetId, rewardAssetId] = item.args;

      return {
        poolAsset: toAssetId(poolAssetId),
        rewardAsset: toAssetId(rewardAssetId),
      };
    });

    const observables = keys.map(({ poolAsset, rewardAsset }) =>
      this.getPoolsByAssetsObservable(poolAsset, rewardAsset)
    );

    return combineLatest(observables).pipe(map((data) => data.flat()));
  }

  /**
   * Get an info about reward token
   * @param assetId asset address
   * @returns Observable token info
   */
  public getTokenInfoObservable(assetId: string): Observable<DemeterRewardToken> {
    return this.root.apiRx.query.demeterFarmingPlatform.tokenInfos(assetId).pipe(
      map((tokenInfo) => {
        const data = tokenInfo.unwrap();

        return {
          assetId,
          tokenPerBlock: new FPNumber(data.tokenPerBlock),
          farmsTotalMultiplier: Number(data.farmsTotalMultiplier),
          stakingTotalMultiplier: Number(data.stakingTotalMultiplier),
          farmsAllocation: new FPNumber(data.farmsAllocation),
          stakingAllocation: new FPNumber(data.stakingAllocation),
          teamAllocation: new FPNumber(data.teamAllocation),
        };
      })
    );
  }

  /**
   * Get a list of all reward tokens
   * @returns Observable list of token infos
   */
  public async getTokenInfosObservable(): Promise<Observable<DemeterRewardToken[]> | null> {
    const storageKeys = await this.root.api.query.demeterFarmingPlatform.tokenInfos.keys();

    if (!storageKeys.length) return null;

    const keys = storageKeys.map((item) => toAssetId(item.args[0]));

    const observables = keys.map((assetId) => this.getTokenInfoObservable(assetId));

    return combineLatest(observables);
  }

  /**
   * Get a list of active account pools for farming & staking
   * @returns Observable list of account pools (farming & staking)
   */
  public getAccountPoolsObservable(): Observable<DemeterAccountPool[]> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.apiRx.query.demeterFarmingPlatform.userInfos(this.root.account.pair.address).pipe(
      map((userInfoVec) => {
        return userInfoVec.map((data) => ({
          isFarm: data.isFarm.isTrue,
          baseAsset: toAssetId(data.baseAsset),
          poolAsset: toAssetId(data.poolAsset),
          pooledTokens: new FPNumber(data.pooledTokens),
          rewardAsset: toAssetId(data.rewardAsset),
          rewards: new FPNumber(data.rewards),
        }));
      })
    );
  }

  /**
   * Deposit LP tokens for farming pool
   * @param amount amount of LP tokens to be provided for farming
   * @param poolAsset address of pool asset (paired with XOR)
   * @param rewardAsset address of reward asset
   * @param baseAsset address of base asset (XOR, XSTUSD)
   */
  public depositLiquidity(
    amount: NumberLike,
    poolAsset: Asset | AccountAsset,
    rewardAsset: Asset | AccountAsset,
    baseAsset: Asset | AccountAsset = XOR
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const isFarm = true;
    const value = new FPNumber(amount).toCodecString();

    return this.root.submitExtrinsic(
      this.root.api.tx.demeterFarmingPlatform.deposit(
        baseAsset.address,
        poolAsset.address,
        rewardAsset.address,
        isFarm,
        value
      ),
      this.root.account.pair,
      {
        type: Operation.DemeterFarmingDepositLiquidity,
        symbol: baseAsset.symbol,
        assetAddress: baseAsset.address,
        symbol2: poolAsset.symbol,
        asset2Address: poolAsset.address,
        amount: `${amount}`,
      }
    );
  }

  /**
   * Withdraw LP tokens from farming pool
   * @param amount amount of LP tokens to be withdrawed from farming
   * @param poolAsset address of pool asset (paired with XOR)
   * @param rewardAsset address of reward asset
   * @param baseAsset address of base asset (XOR, XSTUSD)
   */
  public withdrawLiquidity(
    amount: NumberLike,
    poolAsset: Asset | AccountAsset,
    rewardAsset: Asset | AccountAsset,
    baseAsset: Asset | AccountAsset = XOR
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const isFarm = true;
    const value = new FPNumber(amount).toCodecString();

    return this.root.submitExtrinsic(
      this.root.api.tx.demeterFarmingPlatform.withdraw(
        baseAsset.address,
        poolAsset.address,
        rewardAsset.address,
        value,
        isFarm
      ),
      this.root.account.pair,
      {
        type: Operation.DemeterFarmingWithdrawLiquidity,
        symbol: baseAsset.symbol,
        assetAddress: baseAsset.address,
        symbol2: poolAsset.symbol,
        asset2Address: poolAsset.address,
        amount: `${amount}`,
      }
    );
  }

  /**
   * Stake token
   * @param asset address of asset to be staked
   * @param rewardAsset address of reward asset
   * @param amount amount of tokens to be staked
   */
  public stake(asset: Asset | AccountAsset, rewardAsset: Asset | AccountAsset, amount: NumberLike): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const isFarm = false;
    const value = new FPNumber(amount, asset.decimals).toCodecString();

    return this.root.submitExtrinsic(
      this.root.api.tx.demeterFarmingPlatform.deposit(asset.address, asset.address, rewardAsset.address, isFarm, value),
      this.root.account.pair,
      {
        type: Operation.DemeterFarmingStakeToken,
        symbol: asset.symbol,
        assetAddress: asset.address,
        amount: `${amount}`,
      }
    );
  }

  /**
   * Unstake token
   * @param asset address of asset to be unstaked
   * @param rewardAsset address of reward asset
   * @param amount amount of tokens to be unstaked
   */
  public unstake(asset: Asset | AccountAsset, rewardAsset: Asset | AccountAsset, amount: NumberLike): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const isFarm = false;
    const value = new FPNumber(amount, asset.decimals).toCodecString();

    return this.root.submitExtrinsic(
      this.root.api.tx.demeterFarmingPlatform.withdraw(
        asset.address,
        asset.address,
        rewardAsset.address,
        value,
        isFarm
      ),
      this.root.account.pair,
      {
        type: Operation.DemeterFarmingUnstakeToken,
        symbol: asset.symbol,
        assetAddress: asset.address,
        amount: `${amount}`,
      }
    );
  }

  /**
   * Get rewards from farming or staking pool
   * @param isFarm flag indicated is getting rewards from farming or staking pool
   * @param asset asset (staking) or pool asset (farming) address
   * @param rewardAsset reward asset address
   * @param baseAsset address of base asset (XOR, XSTUSD) for farming pool or staking token
   * @param amount amount (for history only)
   */
  public getRewards(
    isFarm: boolean,
    asset: Asset | AccountAsset,
    rewardAsset: Asset | AccountAsset,
    baseAsset: Asset | AccountAsset = XOR,
    amount?: NumberLike
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    // for staking base asset should be equal to staking asset
    const baseAssetAddress = isFarm ? baseAsset.address : asset.address;

    return this.root.submitExtrinsic(
      this.root.api.tx.demeterFarmingPlatform.getRewards(baseAssetAddress, asset.address, rewardAsset.address, isFarm),
      this.root.account.pair,
      {
        type: Operation.DemeterFarmingGetRewards,
        symbol: rewardAsset.symbol,
        assetAddress: rewardAsset.address,
        amount: amount ? `${amount}` : undefined,
      }
    );
  }
}
