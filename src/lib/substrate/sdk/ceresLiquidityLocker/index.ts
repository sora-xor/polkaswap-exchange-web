import { map } from 'rxjs';
import { assert } from '@polkadot/util';
import { FPNumber } from '@sora-substrate/math';
import type { Observable } from '@polkadot/types/types';

import { toAssetId } from '../assets';
import { Messages } from '../logger';
import { Operation } from '../types';

import type { Api } from '../api';
import type { AccountAsset, Asset } from '../assets/types';
import type { AccountLockedPool } from './types';

export class CeresLiquidityLockerModule<T> {
  constructor(private readonly root: Api<T>) {}

  /**
   * Get list of account locked pools
   * @param onlyActual get locked pools at that moment, not all the history
   */
  public getLockerDataObservable(onlyActual = true): Observable<AccountLockedPool[]> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.apiRx.query.ceresLiquidityLocker.lockerData(this.root.account.pair.address).pipe(
      map((lockedData) => {
        const infos = [...lockedData.values()].map((value) => {
          return {
            poolTokens: new FPNumber(value.poolTokens),
            unlockingTimestamp: value.unlockingTimestamp.toNumber(),
            assetA: toAssetId(value.assetA),
            assetB: toAssetId(value.assetB),
          };
        });

        if (!onlyActual) return infos;

        const currentTimestamp = Date.now();

        return infos.filter((info) => info.unlockingTimestamp >= currentTimestamp);
      })
    );
  }

  /**
   * Lock account liquidity
   * @param baseAsset pool base asset
   * @param poolAsset pool target asset
   * @param unlockingTimestamp timestamp to unlock
   * @param percentageOfPoolTokens percent of pooled tokens (from 0 to 100)
   * @param option pay locker fees, otherwise to ceres team
   */
  public async lockLiquidity(
    baseAsset: Asset | AccountAsset,
    poolAsset: Asset | AccountAsset,
    unlockingTimestamp: number,
    percentageOfPoolTokens: number,
    option = false
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const percent = new FPNumber(percentageOfPoolTokens).div(FPNumber.HUNDRED).toCodecString();

    return this.root.submitExtrinsic(
      this.root.api.tx.ceresLiquidityLocker.lockLiquidity(
        baseAsset.address,
        poolAsset.address,
        unlockingTimestamp,
        percent,
        option
      ),
      this.root.account.pair,
      {
        type: Operation.CeresLiquidityLockerLockLiquidity,
        symbol: baseAsset.symbol,
        assetAddress: baseAsset.address,
        symbol2: poolAsset.symbol,
        asset2Address: poolAsset.address,
      }
    );
  }
}
