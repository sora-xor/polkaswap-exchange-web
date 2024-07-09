import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export type IParachainAssetMetadata<AssetId = any> = {
  id: AssetId;
  symbol: string;
  decimals: number;
  minimalBalance: string;
};

export class ParachainAdapter<AssetId> extends SubAdapter {
  protected assets: readonly IParachainAssetMetadata<AssetId>[] | null = null;

  // overrides SubAdapter
  public override async connect(): Promise<void> {
    await super.connect();
    await this.getAssetsMetadata();
  }

  protected async getAssetsMetadata(): Promise<void> {
    if (Array.isArray(this.assets)) return;

    const assets: IParachainAssetMetadata<AssetId>[] = [];
    const entries = await (this.api.query.assets as any).metadata.entries();

    for (const [key, value] of entries) {
      const id = key.args[0].toString();
      const symbol = new TextDecoder().decode(value.symbol); // bytes to string
      const decimals = value.decimals.toNumber();
      const minimalBalance = value.deposit.toString();

      assets.push({ id, symbol, decimals, minimalBalance });
    }

    this.assets = Object.freeze(assets);
  }

  protected getAssetMeta(asset: RegisteredAsset): Nullable<IParachainAssetMetadata<AssetId>> {
    if (!Array.isArray(this.assets)) return null;

    return this.assets.find((item) => item.id === asset.externalAddress || item.symbol === asset.symbol);
  }

  // overrides SubAdapter
  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    const minBalance = assetMeta.minimalBalance;

    return minBalance > '1' ? minBalance : ZeroStringValue;
  }

  public async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
    /* Throws error until Substrate 5 migration */
    // return await super.getNetworkFee(asset, sender, recipient);
    // Hardcoded values
    switch (this.subNetwork) {
      case SubNetworkId.PolkadotAcala:
        return '3000000000';
      case SubNetworkId.PolkadotAstar:
        return '57000000000000000';
      case SubNetworkId.AlphanetMoonbase:
        return '40000000000000';
      default:
        return '0';
    }
  }
}
