import { DexId } from './consts';
import { toAssetId } from '../assets';
import { XOR, XST } from '../assets/consts';

import type { Api } from '../api';
import type { DexInfo } from './types';

import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';

export class DexModule<T> {
  constructor(private readonly root: Api<T>) {}

  public static readonly defaultDexId = DexId.XOR;
  public static readonly defaultBaseAssetId = XOR.address;
  public static readonly defaultSyntheticAssetId = XST.address;

  public dexList: DexInfo[] = [];
  public lockedSources: LiquiditySourceTypes[] = [];
  public enabledSources: LiquiditySourceTypes[] = [];

  get publicDexes(): DexInfo[] {
    return this.dexList.filter((dex) => !!dex.isPublic);
  }

  get poolBaseAssetsIds(): string[] {
    return this.publicDexes.map((item) => item.baseAssetId);
  }

  get baseAssetsIds(): string[] {
    return this.dexList.map((item) => item.baseAssetId);
  }

  public async update(): Promise<void> {
    await Promise.allSettled([this.updateList(), this.updateEnabledSources(), this.updateLockedSources()]);
  }

  public async updateList(): Promise<void> {
    const data = await this.root.api.query.dexManager.dexInfos.entries();

    this.dexList = data.map(([key, codec]) => {
      const dexId = key.args[0].toNumber();
      const baseAssetId = toAssetId(codec.value.baseAssetId);
      const syntheticBaseAssetId = toAssetId(codec.value.syntheticBaseAssetId);
      const isPublic = codec.value.isPublic.isTrue;

      return { dexId, baseAssetId, syntheticBaseAssetId, isPublic };
    });
  }

  public async updateLockedSources(): Promise<void> {
    const sources = await this.root.api.query.tradingPair.lockedLiquiditySources();

    this.lockedSources = sources.map((source) => source.toString() as LiquiditySourceTypes);
  }

  public async updateEnabledSources(): Promise<void> {
    const sources = await this.root.api.query.dexapi.enabledSourceTypes();

    this.enabledSources = sources.map((source) => source.toString() as LiquiditySourceTypes);
  }

  public getDexId(baseAssetId: string): number {
    return this.dexList.find((dex) => dex.baseAssetId === baseAssetId)?.dexId ?? DexModule.defaultDexId;
  }

  public getBaseAssetId(dexId: number): string {
    return this.dexList.find((dex) => dex.dexId === dexId)?.baseAssetId ?? DexModule.defaultBaseAssetId;
  }

  public getSyntheticBaseAssetId(dexId: number): string {
    return this.dexList.find((dex) => dex.dexId === dexId)?.syntheticBaseAssetId ?? DexModule.defaultSyntheticAssetId;
  }
}
