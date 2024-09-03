import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';
import { areEqual } from '@/utils';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/util';
import type { Asset, RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export type IParachainAssetMetadata<AssetId = any> = {
  id: AssetId;
  symbol: string;
  decimals: number;
  minimalBalance?: string;
};

export class ParachainAdapter<AssetId> extends SubAdapter {
  protected assets: readonly IParachainAssetMetadata<AssetId>[] | null = null;

  protected async getAssetsMetadata(): Promise<void> {
    if (Array.isArray(this.assets)) return;

    const assets: IParachainAssetMetadata<AssetId>[] = [];
    const entries = await (this.api.query.assets as any).metadata.entries();

    for (const [key, value] of entries) {
      const id = key.args[0].toString();
      const symbol = new TextDecoder().decode(value.symbol); // bytes to string
      const decimals = value.decimals.toNumber();

      assets.push({ id, symbol, decimals });
    }

    this.assets = Object.freeze(assets);
  }

  public getAssetMeta(asset: RegisteredAsset): Nullable<IParachainAssetMetadata<AssetId>> {
    if (!Array.isArray(this.assets)) return null;

    return this.assets.find((item) => areEqual(item.id, asset.externalAddress) || item.symbol === asset.symbol);
  }

  /**
   * Get asset external address by multilocation (for "registeredAsset.externalAddress" struct))
   */
  public async getAssetIdByMultilocation(asset: Asset, multilocation: any): Promise<any> {
    throw new Error(`[${this.constructor.name}] "getAssetIdByMultilocation" method is not implemented`);
  }

  /**
   * Convert substrate asset id to evm token contract address
   */
  public assetIdToEvmContractAddress(id: string): string {
    throw new Error(`[${this.constructor.name}] "assetIdToEvmContractAddress" method is not implemented`);
  }

  // overrides SubAdapter
  protected override async getAssetDeposit(asset: RegisteredAsset): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    const { minimalBalance, id } = assetMeta;

    if (minimalBalance) return minimalBalance;

    return await this.assetMinBalanceRequest(id as string);
  }

  public override async getNetworkFee(asset: RegisteredAsset, sender: string, recipient: string): Promise<CodecString> {
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
      case SubNetworkId.KusamaCurio:
        return '70000000000000000';
      default:
        return '0';
    }
  }
}
