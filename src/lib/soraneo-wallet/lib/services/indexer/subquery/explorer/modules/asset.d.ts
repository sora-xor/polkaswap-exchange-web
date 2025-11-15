import { SubqueryBaseModule } from './_base';
import { Asset } from '@sora-substrate/sdk/build/assets/types';

export declare class SubqueryAssetModule extends SubqueryBaseModule {
  createNewAssetsSubscription(handler: (entity: Asset[]) => void, errorHandler: (error: any) => void): VoidFunction;
}
