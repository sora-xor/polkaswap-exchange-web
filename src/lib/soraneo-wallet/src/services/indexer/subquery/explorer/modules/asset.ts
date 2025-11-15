import { parseAssetRegistrationStreamUpdate } from '../../../explorer/utils';
import { AssetRegistrationStreamSubscription } from '../../subscriptions/stream';

import { SubqueryBaseModule } from './_base';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export class SubqueryAssetModule extends SubqueryBaseModule {
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
