import { ZeroStringValue } from '@/consts';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import { SubAdapter } from '../substrate';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';

export class SoraParachainAdapter extends SubAdapter {
  public override getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: CodecString) {
    return subBridgeApi.soraParachainApi.getTransferExtrinsic(asset, recipient, amount, this.api);
  }

  public async getAssetMinimumAmount(assetAddress: string): Promise<CodecString> {
    return await this.withConnection(async () => {
      // sora address
      return await subBridgeApi.soraParachainApi.getAssetMinimumAmount(assetAddress, this.api);
    }, ZeroStringValue);
  }
}
