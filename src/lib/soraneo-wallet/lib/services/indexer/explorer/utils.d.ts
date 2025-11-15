import { SubqueryAssetEntity } from '../subquery/types';
import { SubsquidAssetEntity } from '../subsquid/types';
import { FiatPriceObject, UpdatesStream } from '../types';
import { Asset } from '@sora-substrate/sdk/build/assets/types';

export declare function parseAssetFiatPrice(entity: SubsquidAssetEntity | SubqueryAssetEntity): FiatPriceObject;
export declare function parsePriceStreamUpdate(entity: UpdatesStream): Nullable<FiatPriceObject>;
export declare function parseAssetRegistrationStreamUpdate(entity: UpdatesStream): Asset[];
