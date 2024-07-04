import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { ZeroStringValue } from '@/consts';
import { SUB_NETWORKS } from '@/consts/sub';

import { ParachainAdapter } from './parachain';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

const MOONBASE_DATA = SUB_NETWORKS[SubNetworkId.AlphanetMoonbase];

type IMoonbaseAssetId = string;

export class MoonbaseParachainAdapter extends ParachainAdapter<IMoonbaseAssetId> {
  public async getAssetIdByMultilocation(multilocation: any): Promise<string | null> {
    const assetType = {
      XCM: multilocation,
    };

    const result = await (this.api.query.assetManager as any).assetTypeId(assetType);

    if (result.isEmpty) return null;

    const id = result.unwrap().toString();

    return id;
  }

  protected override async getAccountAssetBalance(
    accountAddress: string,
    asset: RegisteredAsset
  ): Promise<CodecString> {
    const assetMeta = this.getAssetMeta(asset);

    if (!assetMeta) return ZeroStringValue;

    return await this.assetsAccountRequest(accountAddress, assetMeta.id);
  }

  // overrides "WithConnectionApi"
  override get chainSymbol(): string | undefined {
    return MOONBASE_DATA?.nativeCurrency?.symbol;
  }

  // overrides "WithConnectionApi"
  public override formatAddress(address: string, _withPrefix = true): string {
    // return evm address without changes
    return address;
  }
}
