import { subBridgeApi } from '@/utils/bridge/sub/api';

import { SubAdapter } from './substrate';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAsset } from '@sora-substrate/util/build/assets/types';

export class SoraParachainAdapter extends SubAdapter {
  protected getTransferExtrinsic(asset: RegisteredAsset, recipient: string, amount: CodecString) {
    return subBridgeApi.soraParachainApi.getTransferExtrinsic(asset, recipient, amount, this.api);
  }

  // overrides SubAdapter method
  public async getAssetMinimumAmount(assetAddress: string): Promise<CodecString> {
    await this.connect();
    // sora address
    const value = await subBridgeApi.soraParachainApi.getAssetMinimumAmount(assetAddress, this.api);

    return value;
  }
}
