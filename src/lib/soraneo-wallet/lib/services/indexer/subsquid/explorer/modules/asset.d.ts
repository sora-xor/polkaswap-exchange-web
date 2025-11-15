import { BaseModule } from './_base';
import { Asset } from '@sora-substrate/sdk/build/assets/types';

export declare class SubsquidAssetModule extends BaseModule {
  createNewAssetsSubscription(handler: (entity: Asset[]) => void, errorHandler: (error: any) => void): VoidFunction;
}
