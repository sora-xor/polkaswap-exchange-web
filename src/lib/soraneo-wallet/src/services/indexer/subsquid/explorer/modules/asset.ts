import { parseAssetRegistrationStreamUpdate } from '../../../explorer/utils';
import { AssetRegistrationStreamSubscription } from '../../subscriptions/stream';

import { BaseModule } from './_base';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export class SubsquidAssetModule extends BaseModule {
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
