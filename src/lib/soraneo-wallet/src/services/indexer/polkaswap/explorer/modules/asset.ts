import { parseAssetRegistrationStreamUpdate } from '../../../explorer/utils';
import { AssetRegistrationStreamSubscription } from '../../subscriptions/stream';

import { PolkaswapBaseModule } from './_base';

import type { Asset } from '@/lib/substrate/sdk/assets/types';

export class PolkaswapAssetModule extends PolkaswapBaseModule {
  public createNewAssetsSubscription(
    handler: (entity: Asset[]) => void,
    errorHandler: (error: any) => void
  ): VoidFunction {
    const subscription = this.root.createEntitySubscription(
      AssetRegistrationStreamSubscription,
      {},
      parseAssetRegistrationStreamUpdate,
      handler,
      errorHandler
    );

    return subscription;
  }
}
