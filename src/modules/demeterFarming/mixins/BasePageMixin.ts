import { FPNumber } from '@sora-substrate/math';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import type { DemeterAsset, DemeterPoolDerived, DemeterPoolDerivedData } from '@/modules/demeterFarming/types';
import { state, getter } from '@/store/decorators';
import { formatDecimalPlaces } from '@/utils';

import AprMixin from './AprMixin';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

type Pool = DemeterPool | DemeterAccountPool;

const createPoolsDoubleMap = <T extends Pool>(pools: readonly T[], isFarm = true): DoubleMap<T[]> => {
  return pools.reduce((buffer, pool) => {
    if (pool.isFarm !== isFarm) return buffer;

    if (!buffer[pool.baseAsset]) buffer[pool.baseAsset] = {};
    if (!buffer[pool.baseAsset][pool.poolAsset]) buffer[pool.baseAsset][pool.poolAsset] = [];

    buffer[pool.baseAsset][pool.poolAsset].push(pool);

    return buffer;
  }, {});
};

@Component
export default class BasePageMixin extends Mixins(AprMixin) {
  @Prop({ default: true, type: Boolean }) readonly isFarmingPage!: boolean;

  @state.demeterFarming.tokens tokens!: DemeterRewardToken[];
  @state.demeterFarming.pools demeterPools!: DemeterPool[];
  @state.demeterFarming.accountPools demeterAccountPools!: DemeterAccountPool[];

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  showCalculatorDialog = false;

  baseAsset: Nullable<string> = null;
  poolAsset: Nullable<string> = null;
  rewardAsset: Nullable<string> = null;
  liquidity: Nullable<AccountLiquidity> = null;

  get tokenInfos(): DataMap<DemeterRewardToken> {
    return this.tokens.reduce((buffer, token) => ({ ...buffer, [token.assetId]: token }), {});
  }

  get uniqueAssets(): string[] {
    const adresses = this.demeterPools.reduce<string[]>((buffer, pool) => {
      buffer.push(pool.baseAsset, pool.poolAsset, pool.rewardAsset);
      return buffer;
    }, []);

    return [...new Set(adresses)];
  }

  get demeterAssetsData(): Record<string, DemeterAsset> {
    return this.uniqueAssets.reduce((buffer, address) => {
      const asset = this.getAsset(address);
      const price = asset ? FPNumber.fromCodecValue(this.getAssetFiatPrice(asset) ?? 0) : FPNumber.ZERO;

      buffer[address] = { ...asset, price };

      return buffer;
    }, {});
  }

  get pools(): DoubleMap<DemeterPool[]> {
    return createPoolsDoubleMap(this.demeterPools, this.isFarmingPage);
  }

  get accountPools(): DoubleMap<DemeterAccountPool[]> {
    return createPoolsDoubleMap(this.demeterAccountPools, this.isFarmingPage);
  }

  get selectedPool(): Nullable<DemeterPool> {
    if (!this.baseAsset || !this.poolAsset || !this.pools[this.baseAsset][this.poolAsset]) return null;

    return this.pools[this.baseAsset][this.poolAsset].find((pool) => pool.rewardAsset === this.rewardAsset);
  }

  get selectedAccountPool(): Nullable<DemeterAccountPool> {
    return this.selectedPool ? this.getAccountPool(this.selectedPool) : null;
  }

  getDerivedPools(pools: DemeterPool[]): DemeterPoolDerived[] {
    if (!Array.isArray(pools)) return [];

    return pools.reduce<DemeterPoolDerived[]>((buffer, pool) => {
      const poolIsActive = !pool.isRemoved;
      const accountPool = this.getAccountPool(pool);
      const accountPoolIsActive = !!accountPool && this.isActiveAccountPool(accountPool);

      if (!(poolIsActive || accountPoolIsActive)) return buffer;

      buffer.push({
        pool,
        accountPool,
      });

      return buffer;
    }, []);
  }

  isActiveAccountPool(accountPool: DemeterAccountPool): boolean {
    return !(accountPool.pooledTokens.isZero() && accountPool.rewards.isZero());
  }

  prepareDerivedPoolData(
    pool: DemeterPool,
    accountPool: Nullable<DemeterAccountPool>,
    liquidity?: Nullable<AccountLiquidity>
  ): DemeterPoolDerivedData {
    const baseAsset = this.demeterAssetsData[pool.baseAsset];
    const poolAsset = this.demeterAssetsData[pool.poolAsset];
    const rewardAsset = this.demeterAssetsData[pool.rewardAsset];
    const tokenInfo = this.tokenInfos[pool.rewardAsset];
    const emission = this.getEmission(pool, tokenInfo);
    const tvl = this.getTvl(pool, poolAsset.price, liquidity);
    const apr = this.getApr(emission, tvl, rewardAsset.price);
    const aprFormatted = formatDecimalPlaces(apr, true);
    const tvlFormatted = `$${formatDecimalPlaces(tvl)}`;

    return {
      pool,
      accountPool,
      tokenInfo,
      baseAsset,
      poolAsset,
      rewardAsset,
      emission,
      tvl: tvlFormatted,
      apr: aprFormatted,
    };
  }

  getAccountPool(pool: DemeterPool): Nullable<DemeterAccountPool> {
    return this.accountPools[pool.baseAsset]?.[pool.poolAsset]?.find(
      (accountPool) => accountPool.rewardAsset === pool.rewardAsset
    );
  }

  showPoolCalculator(params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }): void {
    this.setDialogParams(params);
    this.showCalculatorDialog = true;
  }

  setDialogParams(params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }): void {
    this.baseAsset = params.baseAsset;
    this.poolAsset = params.poolAsset;
    this.rewardAsset = params.rewardAsset;
    this.liquidity = params.liquidity;
  }
}
