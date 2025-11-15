import type { SubqueryAssetEntity } from '../subquery/types';
import type { SubsquidAssetEntity } from '../subsquid/types';
import type { FiatPriceObject, UpdatesStream } from '../types';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
export declare function parseAssetFiatPrice(entity: SubsquidAssetEntity | SubqueryAssetEntity): FiatPriceObject;
export declare function parsePriceStreamUpdate(entity: UpdatesStream): Nullable<FiatPriceObject>;
export declare function parseAssetRegistrationStreamUpdate(entity: UpdatesStream): Asset[];
